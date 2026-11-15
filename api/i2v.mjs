export const maxDuration = 60; // Amplía el tiempo límite en Vercel al máximo gratuito (60s)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { password, prompt, imageUrl } = req.body;

  if (process.env.APP_PASSWORD && password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  if (!imageUrl || !prompt) {
    return res.status(400).json({ error: 'Falta la imagen o la descripción del movimiento.' });
  }

  try {
    // Extraer solo los datos base64 puros sin la cabecera "data:image/jpeg;base64,"
    const base64Data = imageUrl.split(',')[1];

    const response = await fetch(
      'https://router.huggingface.co/fal-ai/fal-ai/wan/v2.1/image-to-video',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json',
          'x-wait-for-model': 'true' // Espera automáticamente si el modelo está arrancando
        },
        body: JSON.stringify({
          inputs: base64Data,
          parameters: {
            prompt: prompt
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Hugging Face: ${errText}` });
    }

    const arrayBuffer = await response.arrayBuffer();
    const videoBase64 = Buffer.from(arrayBuffer).toString('base64');

    return res.status(200).json({
      videoUrl: `data:video/mp4;base64,${videoBase64}`
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
