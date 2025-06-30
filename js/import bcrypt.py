import bcrypt

password = b"bottle@123"
hashed = bcrypt.hashpw(password, bcrypt.gensalt())
print(hashed)
