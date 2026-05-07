const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send email function
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: `"MakaziPlus" <${process.env.EMAIL_FROM || 'noreply@makaziplus.co.tz'}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email error:', error.message);
    return { success: false, error: error.message };
  }
};

// Email templates
const templates = {
  // Welcome email
  welcome: (name) => ({
    subject: 'Karibu MakaziPlus! 🏠',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0d5c36; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Makazi<span style="color: #c8933a;">Plus</span></h1>
        </div>
        <div style="padding: 20px; background: #f4f6f4;">
          <h2>Karibu, ${name}! 🎉</h2>
          <p>Akaunti yako imefunguliwa kikamilifu. Sasa unaweza:</p>
          <ul>
            <li>🔍 Tafuta nyumba au frem</li>
            <li>💬 Wasiliana na wauzaji moja kwa moja</li>
            <li>❤️ Hifadhi mali unazozipenda</li>
            <li>📅 Weka booking za mali</li>
          </ul>
          <p>Anza safari yako ya kutafuta makazi bora Tanzania!</p>
          <a href="${process.env.CLIENT_URL}" style="background: #0d5c36; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Anza Sasa →</a>
        </div>
        <div style="text-align: center; padding: 10px; font-size: 12px; color: #7a8c82;">
          © 2025 MakaziPlus. Haki zote zimehifadhiwa.
        </div>
      </div>
    `,
    text: `Karibu MakaziPlus! ${name}, akaunti yako imefunguliwa. Anza kutafuta nyumba yako ya ndoto kwenye https://makaziplus.vercel.app`,
  }),

  // Booking confirmation email
  bookingConfirmed: ({ propertyTitle, checkIn, checkOut, totalAmount, ownerName, ownerPhone }) => ({
    subject: 'Booking Yako Imethibitishwa! ✅',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0d5c36; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Makazi<span style="color: #c8933a;">Plus</span></h1>
        </div>
        <div style="padding: 20px; background: #f4f6f4;">
          <h2>Booking Imethibitishwa! ✅</h2>
          <p><strong>Mali:</strong> ${propertyTitle}</p>
          <p><strong>Kuingia:</strong> ${new Date(checkIn).toLocaleDateString()}</p>
          <p><strong>Kutoka:</strong> ${new Date(checkOut).toLocaleDateString()}</p>
          <p><strong>Jumla:</strong> TSh ${totalAmount.toLocaleString()}</p>
          <p><strong>Mwenye Nyumba:</strong> ${ownerName}</p>
          <p><strong>Simu:</strong> ${ownerPhone}</p>
          <hr />
          <p>Wasiliana na mwenye nyumba kwa maelezo zaidi.</p>
          <a href="${process.env.CLIENT_URL}/chat" style="background: #0d5c36; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Wasiliana Sasa →</a>
        </div>
        <div style="text-align: center; padding: 10px; font-size: 12px; color: #7a8c82;">
          © 2025 MakaziPlus. Haki zote zimehifadhiwa.
        </div>
      </div>
    `,
    text: `Booking Imethibitishwa! Mali: ${propertyTitle}. Kuingia: ${checkIn}. Jumla: TSh ${totalAmount}. Wasiliana na ${ownerName} kwa simu: ${ownerPhone}`,
  }),

  // Booking request email
  bookingRequest: ({ propertyTitle, checkIn, checkOut, guests, totalAmount, userName, userPhone }) => ({
    subject: 'Ombi Jipya la Booking 📅',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0d5c36; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Makazi<span style="color: #c8933a;">Plus</span></h1>
        </div>
        <div style="padding: 20px; background: #f4f6f4;">
          <h2>Umepata Ombi Jipya la Booking! 📅</h2>
          <p><strong>Mali:</strong> ${propertyTitle}</p>
          <p><strong>Kuingia:</strong> ${new Date(checkIn).toLocaleDateString()}</p>
          <p><strong>Kutoka:</strong> ${new Date(checkOut).toLocaleDateString()}</p>
          <p><strong>Wageni:</strong> ${guests}</p>
          <p><strong>Jumla:</strong> TSh ${totalAmount.toLocaleString()}</p>
          <p><strong>Mwombaji:</strong> ${userName}</p>
          <p><strong>Simu:</strong> ${userPhone}</p>
          <hr />
          <p>Ingia kwenye dashboard yako kuthibitisha au kukataa ombi hili.</p>
          <a href="${process.env.CLIENT_URL}/dashboard" style="background: #0d5c36; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Angalia Dashboard →</a>
        </div>
        <div style="text-align: center; padding: 10px; font-size: 12px; color: #7a8c82;">
          © 2025 MakaziPlus. Haki zote zimehifadhiwa.
        </div>
      </div>
    `,
    text: `Ombi Jipya la Booking! Mali: ${propertyTitle}. Mwombaji: ${userName}. Ingia dashboard yako kuthibitisha.`,
  }),

  // Password reset email
  passwordReset: (otp) => ({
    subject: 'OTP ya Kubadilisha Nywila 🔐',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0d5c36; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Makazi<span style="color: #c8933a;">Plus</span></h1>
        </div>
        <div style="padding: 20px; background: #f4f6f4; text-align: center;">
          <h2>Nambari yako ya OTP</h2>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; background: white; padding: 15px; border-radius: 10px; margin: 20px 0;">${otp}</div>
          <p>OTP hii itaisha baada ya dakika 10.</p>
          <p>Kama hukuomba kubadilisha nywila, ignore ujumbe huu.</p>
        </div>
        <div style="text-align: center; padding: 10px; font-size: 12px; color: #7a8c82;">
          © 2025 MakaziPlus. Haki zote zimehifadhiwa.
        </div>
      </div>
    `,
    text: `Nambari yako ya OTP: ${otp}. OTP hii itaisha baada ya dakika 10.`,
  }),

  // Verification approved
  verificationApproved: () => ({
    subject: 'Uthibitisho Wako Umekubaliwa! ✅',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0d5c36; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Makazi<span style="color: #c8933a;">Plus</span></h1>
        </div>
        <div style="padding: 20px; background: #f4f6f4; text-align: center;">
          <h2>Hongera! ✅</h2>
          <p>Uthibitisho wako umekubaliwa.</p>
          <p>Sasa una nembo ya "Verified" kwenye profaili yako.</p>
          <p>Wateja wanakuamini zaidi!</p>
          <a href="${process.env.CLIENT_URL}/profile" style="background: #0d5c36; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Angalia Profaili →</a>
        </div>
        <div style="text-align: center; padding: 10px; font-size: 12px; color: #7a8c82;">
          © 2025 MakaziPlus. Haki zote zimehifadhiwa.
        </div>
      </div>
    `,
    text: 'Hongera! Uthibitisho wako umekubaliwa. Sasa una nembo ya "Verified" kwenye profaili yako.',
  }),
};

module.exports = { sendEmail, templates };