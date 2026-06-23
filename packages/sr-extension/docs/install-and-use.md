# Install And Use The SR Output Tool Extension

This guide is for installing the extension from a downloaded release zip file.

## Install The Extension

1. Download `sr-extension-chrome.zip` from the GitHub Release page.
2. Unzip the downloaded file.
   This creates a folder named `sr-extension-chrome`.
3. Move the unzipped `sr-extension-chrome` folder somewhere safe and easy to find later, such as your Documents folder.
   Chrome loads the extension from this folder, so do not delete it after installing.
4. Open Chrome and go to:

   ```text
   chrome://extensions/
   ```

5. Enable **Developer mode** using the toggle in the top-right.
6. Click **Load unpacked**.
7. Select the unzipped `sr-extension-chrome` folder.
   Do not select the zip file itself.
8. The **SR Output Tool** extension should now appear in your extensions list.
9. Optional: click the puzzle-piece icon in Chrome and pin **SR Output Tool** to the toolbar.

## Use The Extension

1. Open the webpage you want to inspect.
2. Click the **SR Output Tool** extension icon in the Chrome toolbar.
3. Click **Pick On Page** to select one element/subtree, or click **Scan Page** to scan the full page.
4. If picking, click the part of the page you want to inspect.
5. Review the generated screen reader output in the panel.
6. Hover over an output row to highlight the matching element on the page.
7. Click **Copy Output** if you want to copy the announcements as plain text.
8. Click **Clear Log** to reset the panel.

## Update To A New Version

1. Download the new `sr-extension-chrome.zip` from the latest GitHub Release.
2. Unzip it.
3. Replace your old saved `sr-extension-chrome` folder with the new one.
4. Go to:

   ```text
   chrome://extensions/
   ```

5. Find **SR Output Tool**.
6. Click **Reload**.

If Chrome cannot reload the extension, remove the old **SR Output Tool** extension from `chrome://extensions/`, then click **Load unpacked** and select the new unzipped `sr-extension-chrome` folder.

## Important Notes

- Keep the unzipped `sr-extension-chrome` folder after installing. Chrome needs it to keep the extension loaded.
- If you move or delete the folder, Chrome may no longer be able to run the extension.
- This tool gives a fast approximation of Chrome + VoiceOver output, but important accessibility flows should still be checked with real assistive technology.
