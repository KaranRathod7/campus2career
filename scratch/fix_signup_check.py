with open('index.html', 'rb') as f:
    raw = f.read().decode('utf-8')

nl = "\r\n"

stray = (
    "          showAuthAlert(\"Please fill in your name, email, and password to sign up.\");" + nl +
    "          triggerAlertShake('authStatusAlert');" + nl +
    "          return;" + nl +
    "        }" + nl
)

print("stray found:", stray in raw)
if stray in raw:
    raw = raw.replace(stray, "", 1)
    with open('index.html', 'wb') as f:
        f.write(raw.encode('utf-8'))
    print("Stray block removed successfully!")
