export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { action, password, prompt, imageUrl } = req.body;

  if (process.env.APP_PASSWORD && password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  // En Hugging Face la respuesta devuelve el vídeo directamente en la primera llamada
  if (action === 'start') {
    try {
      // Extraer solo los datos base64 puros sin la cabecera "data:image/jpeg;base64,"
      const base64Data = imageUrl.split(',')[1];

      const response = await fetch(
        'https://router.huggingface.co/hf-inference/models/Wan-AI/Wan2.1-I2V-14B-480P',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HF_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: base64Data,
            parameters: { prompt }
          })
        }
      );

      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({ error: `Hugging Face: ${err}` });
      }

      const arrayBuffer = await response.arrayBuffer();
      const videoBase64 = Buffer.from(arrayBuffer).toString('base64');

      return res.status(200).json({
        directVideoUrl: `data:video/mp4;base64,${videoBase64}`
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}
