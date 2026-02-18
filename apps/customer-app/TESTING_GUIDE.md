# Testing Your iOS App with Expo

You requested to "publish" your app to test it. With modern Expo (EAS), the workflow has shifted.

## 1. Quickest Way: Expo Go (No Build Required)

For immediate testing on your physical iPhone or the iOS Simulator, you don't need to build or publish.

1.  **Start the development server:**
    ```bash
    # Run this in apps/customer-app
    npx expo start
    ```
2.  **Test on iPhone:**
    *   Download the **Expo Go** app from the App Store.
    *   Scan the QR code shown in your terminal.
    *   *Note:* Ensure your phone and computer are on the same Wi-Fi. If not, use `npx expo start --tunnel`.

3.  **Test on Simulator:**
    *   Press `i` in the terminal to open in the iOS Simulator (if Xcode is installed).

## 2. Building for Simulator (Standalone App)

If you want to verify the native build process without a paid Apple Developer Account, you can build for the iOS Simulator.

1.  **Run the build command:**
    ```bash
    npx eas build --platform ios --profile development-simulator
    ```
2.  **Install:**
    *   Once finished, download the build (app.tar.gz) and drag the `.app` bundle onto your Simulator.

## 3. Building for Physical Devices (Ad Hoc / TestFlight)

*   **Requirement:** Enrolled Apple Developer Program ($99/year).
*   **Command:** `npx eas build --platform ios --profile development` (or production).
*   **Why it failed:** Your previous attempt likely stopped because it required signing credentials that only paid accounts have.

## 4. Updates (OTA)

If you have a build installed and want to push JavaScript changes without rebuilding:
```bash
npx eas update --branch development --message "Testing update"
```
*Note:* This only works if you already have a compatible build installation.
