const Guest = require('../models/Guest');

exports.getGuestQRCode = async (req, res) => {
  const { guest_id } = req.params;

  try {
    const guest = await Guest.findOne({ where: { guest_id } });

    if (!guest) {
      return res.status(404).send('Guest not found');
    }

    let qrCodeBase64 = guest.qr_code_url.toString('base64');

    // Convert to WebP if necessary (additional fallback logic can be added here)
    const qrCodeWebP = `data:image/webp;base64,${qrCodeBase64}`;

    res.render('public/guest-qrcode', {
      guest: {
        fullname: guest.fullname,
        qrCodeWebP,
      }
    });
  } catch (error) {
    console.error('Error fetching guest:', error);
    res.status(500).send('An error occurred while fetching the guest.');
  }
};
