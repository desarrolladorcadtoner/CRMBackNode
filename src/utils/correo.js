// src/utils/correo.js
const nodemailer = require("nodemailer");
require("dotenv").config();

async function enviarCorreoBienvenida(destinatario, usuario, pwd) {
    const html = `<html>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 40px; color: #333;">
                <tr>
                  <td align="center" style="padding-bottom: 30px;">
                    <h1 style="color: #005FAD; margin: 0;">Bienvenido a CadToner</h1>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="font-size: 15px; line-height: 1.7;">
                      Nos complace darle la bienvenida como nuevo distribuidor oficial de <strong>Cad Toner</strong>, la empresa líder en el suministro de consumibles de Tinta y Tóner a nivel nacional.
                    </p>
                    <p style="font-size: 15px; line-height: 1.7;">
                      Agradecemos su confianza y estamos encantados de iniciar esta colaboración que estamos seguros será exitosa y mutuamente beneficiosa.
                    </p>
                    <p style="font-size: 15px; line-height: 1.7;">
                      En <strong>Cad Toner</strong>, nos dedicamos a ofrecer productos de la más alta calidad y a proporcionar un servicio excepcional a todos nuestros socios comerciales. Como distribuidor, usted tendrá acceso exclusivo a nuestra amplia gama de productos y soporte técnico especializado.
                    </p>
                    <p style="font-size: 15px; line-height: 1.7;">
                      Nuestro compromiso es asegurarnos de que tenga todas las herramientas y recursos necesarios para satisfacer las necesidades de sus clientes y alcanzar sus objetivos comerciales.
                    </p>
                    <p style="font-size: 15px; line-height: 1.7;">
                      Una vez más, le damos la más cordial bienvenida a la familia <strong>Cad Toner</strong>. Estamos seguros de que juntos lograremos grandes éxitos y esperamos fortalecer esta relación comercial en el futuro.
                    </p>
                    <blockquote style="font-style: italic; color: #005FAD; margin-top: 30px; font-size: 14px; border-left: 4px solid #ec008c; padding-left: 12px;">
                      "En Cad Toner más que ser un simple proveedor de cartuchos, queremos ser tu Socio de Negocios"
                    </blockquote>
                    <p style="margin-top: 40px;">
                      <strong>Tus credenciales de acceso:</strong>
                    </p>
                    <table style="margin: 16px 0; background:#f4f4f4; border-radius:6px; font-family: monospace; font-size: 16px;">
                      <tr>
                        <td style="padding: 8px 16px;"><b>Usuario:</b></td>
                        <td style="padding: 8px 16px;">${usuario}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 16px;"><b>Contraseña:</b></td>
                        <td style="padding: 8px 16px;">${pwd}</td>
                      </tr>
                    </table>
                    <p style="font-size: 13px; color: #666;">
                      Por seguridad, te sugerimos cambiar tu contraseña tras el primer acceso.<br>
                      Si tienes dudas o problemas, contáctanos a <a href="mailto:soporte@cadtoner.com.mx">soporte@cadtoner.com.mx</a>
                    </p>
                    <p style="margin-top: 40px;">
                      Atentamente,<br>
                      <strong>Eloy Ríos</strong><br>
                      Director General
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 40px;">
                    <p style="font-size: 12px; color: #999;">© 2025 CadToner S.A. de C.V. - Todos los derechos reservados</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;

    // Funcion para pruebas con Mailtrap
  /*const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOSTTEST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // Mailtrap requiere false
    auth: {
      user: process.env.EMAIL_USERTEST,
      pass: process.env.EMAIL_PASSTEST,
    },
  });*/

  //configuracion para producción
 const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"CadToner" <no-reply@cadtoner.com.mx>`, //process.env.EMAIL_USER,//`"CadToner" <no-reply@cadtoner.com.mx>`,
    to: destinatario,
    subject: "¡Bienvenido a CadToner! Tus credenciales de acceso",
    html,
  });

};

async function bienvenidaClienteWeb(destinatario, usuario, pwd) {
  const html = `
    <html>
      <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: Arial, sans-serif;">
        <table width="100%" cellspacing="0" cellpadding="0" style="padding: 30px 0;">
          <tr>
            <td align="center">
              <table width="600" style="background: #ffffff; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); padding: 40px;">
                <tr>
                  <td align="center" style="padding-bottom: 30px;">
                    <h1 style="color: #005FAD;">¡Bienvenido a la Plataforma Web de Distribuidores CadToner!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 15px; color: #333;">
                    <p>
                      Nos complace informarte que ahora formas parte de nuestra nueva plataforma de distribuidores en línea. Esta herramienta está diseñada para brindarte una experiencia moderna, segura y eficiente para gestionar tus pedidos, documentos y datos como distribuidor CadToner.
                    </p>
                    <p>
                      Gracias por ser parte de nuestra red. Sabemos que tu tiempo es valioso, por eso con esta plataforma buscamos facilitar tu gestión y potenciar nuestra relación comercial.
                    </p>

                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />

                    <p><strong>Tus credenciales de acceso:</strong></p>
                    <table style="background:#f4f4f4; border-radius:6px; font-family: monospace; font-size: 16px; margin: 12px 0;">
                      <tr>
                        <td style="padding: 8px 16px;"><b>Usuario:</b></td>
                        <td style="padding: 8px 16px;">${usuario}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 16px;"><b>Contraseña:</b></td>
                        <td style="padding: 8px 16px;">${pwd}</td>
                      </tr>
                    </table>
                    <p style="font-size: 13px; color: #666;">
                      Por seguridad, te pediremos cambiar tu contraseña en tu primer ingreso a la plataforma.
                    </p>

                    <hr style="margin: 30px 30px; border: none; border-top: 1px solid #ddd;" />

                    <p style="color: #333;">
                      <strong>Importante:</strong><br/>
                      Si tu documentación se encuentra incompleta o desactualizada, deberás subirla desde tu perfil en el apartado <strong>"Mis Documentos"</strong>. 
                      Es indispensable contar con tu información actualizada para poder realizar compras dentro de la plataforma.
                    </p>

                    <p style="margin-top: 40px;">
                      ¡Gracias por confiar en nosotros!
                    </p>

                    <p>
                      Atentamente,<br/>
                      <strong>Equipo CadToner</strong><br/>
                      soporte@cadtoner.com.mx
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 40px;">
                    <p style="font-size: 12px; color: #999;">© 2025 CadToner S.A. de C.V. - Todos los derechos reservados</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    `;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: `"CadToner Web" <no-reply@cadtoner.com.mx>`,
    to: destinatario,
    subject: "¡Acceso a la nueva plataforma de distribuidores CadToner!",
    html,
  });
}



module.exports = {
  enviarCorreoBienvenida,
  bienvenidaClienteWeb
  };
