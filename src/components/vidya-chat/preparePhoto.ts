/** Keep camera photos within the API body limit, preserving readable detail. */
export async function preparePhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    let scale = Math.min(1, 1800 / Math.max(image.width, image.height));
    for (let attempt = 0; attempt < 5; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Your browser could not prepare this photo.');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/jpeg', 0.88);
      if (data.length < 1300000) return data.split(',')[1];
      scale *= 0.8;
    }
    throw new Error('Please crop the photo to the question and try again.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
