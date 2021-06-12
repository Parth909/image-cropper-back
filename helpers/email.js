exports.registerEmailParams = (email, token) => {
  // returning a *params* object || Creating sendEmail *params*

  return {
    Source: process.env.EMAIL_FROM, // email sent from this adminUser
    Destination: {
      ToAddresses: [email], // to this normalUser
    },
    ReplyToAddresses: [process.env.EMAIL_TO], // reply from normalUser to this
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
          <html>
          <h1>Verify Your Email Address</h1>
          <p>Please use the following link to complete your registration: </p>
          <p>${process.env.CLIENT_URL}/auth/activate/${token}</p>
          </html>`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Complete Your Registeration",
      },
    },
  };
};
