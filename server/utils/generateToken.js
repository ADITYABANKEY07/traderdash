import jwt from "jsonwebtoken";

// role is "admin" or "trader" — embedded in the token so middleware can
// verify a token was issued for the right kind of account.
const generateToken = (id, role = "admin") => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
};

export default generateToken;

