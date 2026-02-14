SusAbility Chrome Extension
Author: Brian Mungal
Date: 1/20/26
Capstone II

** TO ENSURE EXTENSION WORKS ********************************
PLEASE DO THIS 
1. Go to chrome://extensions
2. Turn on developer mode
3. Click load unpacked
4. Select the SusAbility (whatever you named the folder)
5. Pin SusAbility
6. Click on the icon
**************************************************************


Description:
The SusAbilityExtension folder contains code for the Capstone Project such as:

manifest.json
popup.html
popup.js
popup.css
README.md

This chrome extension is a tool that delivers a score and a breakdown of helpful information (metadata) for users. The extension can show where information is coming from by looking at outbound sources. When finished, this extension will also provide a citaion for the user. 

Code notes:

manifest.json notes
- unable to make comments within
- manifest_version: 3 - current Chrome extension format
- When extension icon is clicked, open popup.html
- activeTab permission is used to access the curent page URL

popup.html
- html code that runs inside the extension popup 
- contains 2 buttons: analyzeBtn and citeBtn
- contains 1 link to a help page

popup.css
- contains the style sheet for popup.html

popup.js
- Gives the buttons/ links actions through event listeners
