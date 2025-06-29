; Custom installer script for PriceCheck AI Control Panel
; This file customizes the NSIS installer appearance and behavior

; Custom installer pages and branding
!include "MUI2.nsh"
!include "FileFunc.nsh"

; Installer branding
!define MUI_ICON "${BUILD_RESOURCES_DIR}\assets\logo.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${BUILD_RESOURCES_DIR}\assets\logo-banner.png"
!define MUI_HEADERIMAGE_RIGHT
!define MUI_WELCOMEFINISHPAGE_BITMAP "${BUILD_RESOURCES_DIR}\assets\logo-banner.png"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "${BUILD_RESOURCES_DIR}\assets\logo-banner.png"

; Custom welcome page text
!define MUI_WELCOMEPAGE_TITLE "Welcome to PriceCheck AI Setup"
!define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through the installation of PriceCheck AI Control Panel.$\r$\n$\r$\nPriceCheck AI helps Filipino consumers find the best medicine prices across major pharmacy chains.$\r$\n$\r$\nClick Next to continue."

; Custom finish page
!define MUI_FINISHPAGE_TITLE "PriceCheck AI Installation Complete"
!define MUI_FINISHPAGE_TEXT "PriceCheck AI Control Panel has been successfully installed on your computer.$\r$\n$\r$\nYou can now launch the application from your desktop or start menu."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch PriceCheck AI Control Panel"
!define MUI_FINISHPAGE_LINK "Visit J5Apps Website"
!define MUI_FINISHPAGE_LINK_LOCATION "https://j5apps.com"

; Custom installation directory page
!define MUI_DIRECTORYPAGE_TEXT_TOP "Setup will install PriceCheck AI Control Panel in the following folder.$\r$\n$\r$\nTo install in a different folder, click Browse and select another folder."

; Installer pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Custom functions
Function .onInit
    ; Check if application is already running
    System::Call 'kernel32::CreateMutexA(i 0, i 0, t "PriceCheckAI_Installer") i .r1 ?e'
    Pop $R0
    
    StrCmp $R0 0 +3
        MessageBox MB_OK|MB_ICONEXCLAMATION "The installer is already running."
        Abort
        
    ; Check Windows version
    ${IfNot} ${AtLeastWin7}
        MessageBox MB_OK|MB_ICONSTOP "PriceCheck AI requires Windows 7 or later."
        Abort
    ${EndIf}
    
    ; Check if Node.js is installed
    ClearErrors
    ExecWait 'node --version' $0
    ${If} ${Errors}
        MessageBox MB_YESNO|MB_ICONQUESTION "Node.js is required but not found. Would you like to continue anyway?$\r$\n$\r$\nNote: You'll need to install Node.js manually for the application to work." IDYES +2
        Abort
    ${EndIf}
FunctionEnd

Function .onInstSuccess
    ; Create application data directory
    CreateDirectory "$APPDATA\PriceCheck AI"
    
    ; Set permissions for application directory
    AccessControl::GrantOnFile "$INSTDIR" "(S-1-5-32-545)" "FullAccess"
    
    ; Register application for Windows firewall (if needed)
    ; This would allow the backend server to accept connections
    ExecWait 'netsh advfirewall firewall add rule name="PriceCheck AI Backend" dir=in action=allow protocol=TCP localport=3000' $0
    ExecWait 'netsh advfirewall firewall add rule name="PriceCheck AI Frontend" dir=in action=allow protocol=TCP localport=5173' $0
FunctionEnd

; Custom components
Section "PriceCheck AI Core" SecCore
    SectionIn RO  ; Read-only section (always installed)
    
    ; Install main application files
    SetOutPath "$INSTDIR"
    File /r "${APP_DIR}\*.*"
    
    ; Create shortcuts
    CreateDirectory "$SMPROGRAMS\PriceCheck AI"
    CreateShortCut "$SMPROGRAMS\PriceCheck AI\PriceCheck AI.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\assets\logo.ico"
    CreateShortCut "$SMPROGRAMS\PriceCheck AI\Uninstall PriceCheck AI.lnk" "$INSTDIR\Uninstall ${UNINSTALL_APP_KEY}.exe"
    
    ; Desktop shortcut
    CreateShortCut "$DESKTOP\PriceCheck AI.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\assets\logo.ico"
    
    ; Write registry keys
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayName" "PriceCheck AI Control Panel"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayIcon" "$INSTDIR\assets\logo.ico"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "Publisher" "J5Apps"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayVersion" "${VERSION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString" "$INSTDIR\Uninstall ${UNINSTALL_APP_KEY}.exe"
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "NoModify" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "NoRepair" 1
    
    ; Calculate and write installation size
    ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
    IntFmt $0 "0x%08X" $0
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "EstimatedSize" "$0"
SectionEnd

Section "Auto-start with Windows" SecAutoStart
    ; Create registry entry for auto-start
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "PriceCheck AI" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
SectionEnd

Section "Development Tools" SecDevTools
    ; Install additional development dependencies if needed
    SetOutPath "$INSTDIR\tools"
    ; Add any development tools here
SectionEnd

; Section descriptions
LangString DESC_SecCore ${LANG_ENGLISH} "Core application files and control panel interface."
LangString DESC_SecAutoStart ${LANG_ENGLISH} "Automatically start PriceCheck AI when Windows starts."
LangString DESC_SecDevTools ${LANG_ENGLISH} "Additional development tools and utilities."

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SecCore} $(DESC_SecCore)
    !insertmacro MUI_DESCRIPTION_TEXT ${SecAutoStart} $(DESC_SecAutoStart)
    !insertmacro MUI_DESCRIPTION_TEXT ${SecDevTools} $(DESC_SecDevTools)
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; Uninstaller
Function un.onInit
    MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Are you sure you want to completely remove PriceCheck AI and all of its components?" IDYES +2
    Abort
FunctionEnd

Section "Uninstall"
    ; Stop any running services
    ExecWait 'taskkill /F /IM "${APP_EXECUTABLE_FILENAME}" /T' $0
    
    ; Remove firewall rules
    ExecWait 'netsh advfirewall firewall delete rule name="PriceCheck AI Backend"' $0
    ExecWait 'netsh advfirewall firewall delete rule name="PriceCheck AI Frontend"' $0
    
    ; Remove files
    RMDir /r "$INSTDIR"
    
    ; Remove shortcuts
    Delete "$DESKTOP\PriceCheck AI.lnk"
    RMDir /r "$SMPROGRAMS\PriceCheck AI"
    
    ; Remove registry entries
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "PriceCheck AI"
    
    ; Remove application data (optional - ask user)
    MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Do you want to remove all application data and settings?" IDNO +2
    RMDir /r "$APPDATA\PriceCheck AI"
SectionEnd 