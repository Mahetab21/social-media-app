import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer/index";

export const sendEmail=async(mailOptions:Mail.Options)=>{
const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

  const info = await transporter.sendMail({
    from: `socialMediaApp <${process.env.EMAIL_USER}>`,
    ...mailOptions
  });

  console.log("Message sent:", info.messageId);

}
export const generateOtp=async()=>{
    return Math.floor(Math.random()*(999999-100000+1)+100000);
}