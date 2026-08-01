# Play. Complete. Certify. — Code Baymax Challenge

A static activity website titled **Play. Complete. Certify.**, with **Code Baymax Challenge** as its subtitle, for **CSDC101 – Fundamentals of Programming** that embeds **Big Hero 6: Code Baymax**, monitors completion of all four game locations, requires a student name, section, and completion image, and generates a downloadable certificate and proof sheet. The submitted proof image is also placed as a small square on the certificate using a center crop, without stretching or warping.

## Completion rule

The certificate unlocks only after the game has saved completion of the final level in each location:

- Garage: final internal level `5` (displayed levels 1–6)
- Lab: final internal level `14` (displayed levels 7–15)
- Yokai: final internal level `28` (displayed levels 16–29)
- Akuma: final internal level `38` (displayed levels 30–39)

The game stores these milestones in browser local storage as `flambe:levelN-completed`. The wrapper checks those exact records every 1.5 seconds.

## Admin mode

A fixed **Admin mode** button appears at the lower-right corner of the website.

1. Select **Admin mode**.
2. Enter the six-digit code `151578`.
3. The site unlocks and scrolls directly to the certificate section.
4. Select **Exit admin mode** in the certificate banner to restore the normal completion requirement.

Admin access lasts only for the current browser tab and does not mark Garage, Lab, Yokai, or Akuma as complete. The JavaScript stores a SHA-256 hash of the code rather than the plain code.

Because the project is fully static and runs entirely in the browser, this is a convenience feature rather than secure authentication. A technically advanced user can inspect or alter client-side code. Do not rely on it for high-stakes identity or completion verification.

## Local testing

Do not open `index.html` by double-clicking it. The game loads images, audio, JSON, and other files through browser requests and should be served through HTTP.

### Windows

Double-click `START_LOCAL_SERVER.bat`, then open `http://localhost:8000` if the browser does not open automatically.

### macOS or Linux

Run:

```bash
./START_LOCAL_SERVER.sh
```

Then open `http://localhost:8000`.

## Netlify deployment

1. Extract the ZIP.
2. Make sure `index.html`, `app.js`, `styles.css`, and the `game` folder are at the project root.
3. Drag the whole extracted project folder into Netlify Drop, or connect it to a Git repository.
4. No build command is required. The publish directory is `.`.

## Vercel deployment

1. Upload the extracted project to a Git repository.
2. Import the repository in Vercel.
3. Choose **Other** as the framework preset.
4. Leave the build command blank.
5. Set the output directory to `.` if Vercel asks for one.

## Student data and proof images

This is a fully static website. The student's name, section, progress, and generated record remain in the browser. The selected proof image is used locally to generate a proof sheet and a small square proof thumbnail on the certificate. The thumbnail is center-cropped to preserve its proportions, and the downloaded certificate is generated as a lossless PNG. The image is not uploaded to a server by this project.

Students should download both generated files and submit them through the LMS, Google Classroom, or another instructor-approved collection method.

## Important limitations

- Progress belongs to the same browser, device, and deployed domain. Changing any of these starts a separate save record.
- Clearing browser/site data removes progress.
- Because this is a client-side static site, technically advanced users can modify local browser data. The required screenshot and instructor review remain important.
- Confirm that hosting and distributing the supplied third-party game files is permitted for the intended classroom use.


## Favicon

The project includes:

- `favicon.svg` for modern browsers
- `favicon-32.png` as a PNG fallback
- `apple-touch-icon.png` for mobile bookmarks and home-screen shortcuts

The icon uses an original code-and-checkmark design that matches the programming and completion theme.
