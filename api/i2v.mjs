import { Client } from "@gradio/client";

export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { password, prompt, imageUrl } = req.body;

  if (process.env.APP_PASSWORD && password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  if (!imageUrl || !prompt) {
    return res.status(400).json({ error: 'Falta la imagen o la descripción.' });
  }

  try {
    // Convertir el Data URI base64 en un Blob binario estándar
    const base64Data = imageUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const imageBlob = new Blob([buffer], { type: 'image/jpeg' });

    // Conectar al Space gratuito de LTX-Video usando tu HF_TOKEN
    const client = await Client.connect("Lightricks/ltx-video-distilled", {
      hf_token: process.env.HF_TOKEN
    });

    // Ejecutar generación Image-to-Video
    const result = await client.predict("/image_to_video", {
      image: imageBlob,
      prompt: prompt,
      negative_prompt: "worst quality, inconsistent motion, blurry, jittery, distorted",
      height: 512,
      width: 704,
      num_frames: 65,
      seed: 42,
      randomize_seed: true
    });

    // Extraer la URL pública del vídeo generado
    const videoData = result.data[0];
    const finalUrl = videoData?.video?.url || videoData?.url;

    if (!finalUrl) {
      return res.status(500).json({ error: 'No se recibió URL de vídeo del servidor.' });
    }

    return res.status(200).json({ videoUrl: finalUrl });
  } catch (error) {
    return res.status(500).json({ error: `Error HF Space: ${error.message}` });
  }
}
