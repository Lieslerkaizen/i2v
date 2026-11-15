export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { action, password, prompt, imageUrl, requestId } = req.body;

  // Verificación opcional de contraseña
  if (process.env.APP_PASSWORD && password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  const FAL_KEY = process.env.FAL_KEY;
  const ENDPOINT = 'fal-ai/wan-i2v';

  try {
    // 1. Iniciar la generación de vídeo
    if (action === 'start') {
      if (!imageUrl || !prompt) {
        return res.status(400).json({ error: 'Falta la imagen o la descripción del movimiento.' });
      }

      const response = await fetch(`https://queue.fal.run/${ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          image_url: imageUrl,
          aspect_ratio: "auto"
        })
      });

      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data.detail || 'Error al iniciar Fal.ai' });

      return res.status(200).json({ requestId: data.request_id });
    }

    // 2. Consultar el progreso
    if (action === 'status') {
      const statusRes = await fetch(`https://queue.fal.run/${ENDPOINT}/requests/${requestId}/status`, {
        headers: { 'Authorization': `Key ${FAL_KEY}` }
      });
      const statusData = await statusRes.json();

      if (statusData.status === 'COMPLETED') {
        const resultRes = await fetch(`https://queue.fal.run/${ENDPOINT}/requests/${requestId}`, {
          headers: { 'Authorization': `Key ${FAL_KEY}` }
        });
        const resultData = await resultRes.json();
        return res.status(200).json({ status: 'COMPLETED', videoUrl: resultData.video.url });
      }

      if (statusData.status === 'FAILED') {
        return res.status(500).json({ error: 'La generación falló en el servidor.' });
      }

      return res.status(200).json({ status: statusData.status });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
