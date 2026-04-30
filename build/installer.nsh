!include nsDialogs.nsh
!include LogicLib.nsh

!define MUI_BGCOLOR "181818"
!define MUI_TEXTCOLOR "F4F4F4"

Var InstallerTheme
Var InstallerBg
Var InstallerSurface
Var InstallerSurface2
Var InstallerSurface3
Var InstallerText
Var InstallerSubtext
Var InstallerAccent
Var InstallerAccentText
Var InstallerMuted
Var InstallerFieldBg

!ifndef BUILD_UNINSTALLER
Var SetupLocale
Var SetupLanguage
Var SetupLayout
Var SetupTheme
Var SetupSourcePreset
Var SetupLocaleDrop
Var SetupLayoutDrop
Var SetupThemeDrop
Var SetupSourcesDrop
!endif

!ifdef BUILD_UNINSTALLER
Var UninstallDeleteUserData
Var UninstallDeleteUserDataCheckbox
!endif

!macro TypingTrainerThemeFunctions PREFIX
Function ${PREFIX}TypingTrainerApplyThemePalette
  ${If} $InstallerTheme == "catppuccin"
    StrCpy $InstallerBg "1E1E2E"
    StrCpy $InstallerSurface "2A2A3C"
    StrCpy $InstallerSurface2 "35354A"
    StrCpy $InstallerSurface3 "3E3E56"
    StrCpy $InstallerText "CDD6F4"
    StrCpy $InstallerSubtext "A6ADC8"
    StrCpy $InstallerAccent "89B4FA"
    StrCpy $InstallerAccentText "11111B"
  ${ElseIf} $InstallerTheme == "nord"
    StrCpy $InstallerBg "2E3440"
    StrCpy $InstallerSurface "3B4252"
    StrCpy $InstallerSurface2 "434C5E"
    StrCpy $InstallerSurface3 "4C566A"
    StrCpy $InstallerText "ECEFF4"
    StrCpy $InstallerSubtext "D8DEE9"
    StrCpy $InstallerAccent "88C0D0"
    StrCpy $InstallerAccentText "1F2933"
  ${ElseIf} $InstallerTheme == "monokai"
    StrCpy $InstallerBg "272822"
    StrCpy $InstallerSurface "3E3D32"
    StrCpy $InstallerSurface2 "49483E"
    StrCpy $InstallerSurface3 "5A5947"
    StrCpy $InstallerText "F8F8F2"
    StrCpy $InstallerSubtext "CFCFC2"
    StrCpy $InstallerAccent "F92672"
    StrCpy $InstallerAccentText "FFFFFF"
  ${ElseIf} $InstallerTheme == "light"
    StrCpy $InstallerBg "F5F5F5"
    StrCpy $InstallerSurface "FFFFFF"
    StrCpy $InstallerSurface2 "EEEEEE"
    StrCpy $InstallerSurface3 "DDDDDD"
    StrCpy $InstallerText "222222"
    StrCpy $InstallerSubtext "666666"
    StrCpy $InstallerAccent "E8751A"
    StrCpy $InstallerAccentText "FFFFFF"
  ${Else}
    StrCpy $InstallerBg "181818"
    StrCpy $InstallerSurface "1F1F1F"
    StrCpy $InstallerSurface2 "2A2A2A"
    StrCpy $InstallerSurface3 "333333"
    StrCpy $InstallerText "F4F4F4"
    StrCpy $InstallerSubtext "B8B8B8"
    StrCpy $InstallerAccent "E8751A"
    StrCpy $InstallerAccentText "FFFFFF"
  ${EndIf}

  StrCpy $InstallerMuted "888888"
  StrCpy $InstallerFieldBg $InstallerSurface2
FunctionEnd

Function ${PREFIX}TypingTrainerReadThemeFile
  Exch $0
  Push $1
  Push $2

  ClearErrors
  FileOpen $1 "$0" r
  IfErrors done

  loop:
    FileRead $1 $2
    IfErrors close
    StrCmp $2 `    "theme": "catppuccin",$\r$\n` set_catppuccin 0
    StrCmp $2 `    "theme": "catppuccin"$\r$\n` set_catppuccin 0
    StrCmp $2 `    "theme": "catppuccin",$\n` set_catppuccin 0
    StrCmp $2 `    "theme": "catppuccin"$\n` set_catppuccin 0
    StrCmp $2 `    "theme": "nord",$\r$\n` set_nord 0
    StrCmp $2 `    "theme": "nord"$\r$\n` set_nord 0
    StrCmp $2 `    "theme": "nord",$\n` set_nord 0
    StrCmp $2 `    "theme": "nord"$\n` set_nord 0
    StrCmp $2 `    "theme": "monokai",$\r$\n` set_monokai 0
    StrCmp $2 `    "theme": "monokai"$\r$\n` set_monokai 0
    StrCmp $2 `    "theme": "monokai",$\n` set_monokai 0
    StrCmp $2 `    "theme": "monokai"$\n` set_monokai 0
    StrCmp $2 `    "theme": "light",$\r$\n` set_light 0
    StrCmp $2 `    "theme": "light"$\r$\n` set_light 0
    StrCmp $2 `    "theme": "light",$\n` set_light 0
    StrCmp $2 `    "theme": "light"$\n` set_light 0
    StrCmp $2 `    "theme": "dark-orange",$\r$\n` set_dark 0
    StrCmp $2 `    "theme": "dark-orange"$\r$\n` set_dark 0
    StrCmp $2 `    "theme": "dark-orange",$\n` set_dark 0
    StrCmp $2 `    "theme": "dark-orange"$\n` set_dark 0
    Goto loop

  set_catppuccin:
    StrCpy $InstallerTheme "catppuccin"
    Goto close

  set_nord:
    StrCpy $InstallerTheme "nord"
    Goto close

  set_monokai:
    StrCpy $InstallerTheme "monokai"
    Goto close

  set_light:
    StrCpy $InstallerTheme "light"
    Goto close

  set_dark:
    StrCpy $InstallerTheme "dark-orange"

  close:
    FileClose $1

  done:
    Pop $2
    Pop $1
    Pop $0
FunctionEnd

Function ${PREFIX}TypingTrainerReadThemeSnapshot
  ClearErrors
  ReadINIStr $0 "$INSTDIR\data\installer-theme.ini" "Theme" "id"
  ReadINIStr $1 "$INSTDIR\data\installer-theme.ini" "Theme" "bg"
  ReadINIStr $2 "$INSTDIR\data\installer-theme.ini" "Theme" "surface"
  ReadINIStr $3 "$INSTDIR\data\installer-theme.ini" "Theme" "surface2"
  ReadINIStr $4 "$INSTDIR\data\installer-theme.ini" "Theme" "surface3"
  ReadINIStr $5 "$INSTDIR\data\installer-theme.ini" "Theme" "text"
  ReadINIStr $6 "$INSTDIR\data\installer-theme.ini" "Theme" "subtext"
  ReadINIStr $7 "$INSTDIR\data\installer-theme.ini" "Theme" "accent"

  ${If} $1 != ""
  ${AndIf} $2 != ""
  ${AndIf} $3 != ""
  ${AndIf} $4 != ""
  ${AndIf} $5 != ""
  ${AndIf} $6 != ""
  ${AndIf} $7 != ""
    StrCpy $InstallerTheme $0
    StrCpy $InstallerBg $1
    StrCpy $InstallerSurface $2
    StrCpy $InstallerSurface2 $3
    StrCpy $InstallerSurface3 $4
    StrCpy $InstallerText $5
    StrCpy $InstallerSubtext $6
    StrCpy $InstallerAccent $7
    StrCpy $InstallerAccentText "FFFFFF"
    StrCpy $InstallerMuted "888888"
    StrCpy $InstallerFieldBg $InstallerSurface2
  ${EndIf}
FunctionEnd

Function ${PREFIX}TypingTrainerDetectTheme
  StrCpy $InstallerTheme "dark-orange"
  StrCpy $InstallerBg ""

  IfFileExists "$INSTDIR\data\installer-theme.ini" 0 readThemeFromJson
    Call ${PREFIX}TypingTrainerReadThemeSnapshot

  ${If} $InstallerBg != ""
    Goto themeDetected
  ${EndIf}

  readThemeFromJson:
  IfFileExists "$INSTDIR\data\progress.json" 0 +3
    Push "$INSTDIR\data\progress.json"
    Call ${PREFIX}TypingTrainerReadThemeFile

  IfFileExists "$INSTDIR\data\setup-preferences.json" 0 +3
    Push "$INSTDIR\data\setup-preferences.json"
    Call ${PREFIX}TypingTrainerReadThemeFile

  Call ${PREFIX}TypingTrainerApplyThemePalette

  themeDetected:
FunctionEnd

Function ${PREFIX}TypingTrainerStyleDialog
  Pop $0
  SetCtlColors $0 $InstallerText $InstallerBg
FunctionEnd

Function ${PREFIX}TypingTrainerStyleTitle
  Pop $0
  SetCtlColors $0 $InstallerText $InstallerBg
FunctionEnd

Function ${PREFIX}TypingTrainerStyleText
  Pop $0
  SetCtlColors $0 $InstallerSubtext $InstallerBg
FunctionEnd

Function ${PREFIX}TypingTrainerStyleAccent
  Pop $0
  SetCtlColors $0 $InstallerAccent $InstallerBg
FunctionEnd

Function ${PREFIX}TypingTrainerStylePanel
  Pop $0
  SetCtlColors $0 $InstallerText $InstallerSurface
FunctionEnd

Function ${PREFIX}TypingTrainerStyleField
  Pop $0
  SetCtlColors $0 $InstallerText $InstallerFieldBg
FunctionEnd
!macroend

!ifndef BUILD_UNINSTALLER
!insertmacro TypingTrainerThemeFunctions ""
!endif
!ifdef BUILD_UNINSTALLER
!insertmacro TypingTrainerThemeFunctions "un."
!endif

!macro customWelcomePage
  Page custom TypingTrainerSetupPageCreate TypingTrainerSetupPageLeave
!macroend

!macro customUnWelcomePage
  UninstPage custom un.TypingTrainerUninstallPageCreate un.TypingTrainerUninstallPageLeave
!macroend

!macro customUnInit
  StrCpy $UninstallDeleteUserData "0"
  ${GetParameters} $R0
  ${GetOptions} $R0 "--delete-app-data" $R1
  ${IfNot} ${Errors}
    StrCpy $UninstallDeleteUserData "1"
  ${EndIf}
!macroend

!macro customInstall
  IfFileExists "$INSTDIR\data\progress.json" setupPreferencesDone 0

  CreateDirectory "$INSTDIR\data"
  IfFileExists "$INSTDIR\data\setup-preferences.json" 0 +2
    Delete "$INSTDIR\data\setup-preferences.json"

  FileOpen $9 "$INSTDIR\data\setup-preferences.json" w
  FileWrite $9 `{$\r$\n`
  FileWrite $9 `  "settings": {$\r$\n`
  FileWrite $9 `    "interfaceLanguage": "$SetupLocale",$\r$\n`
  FileWrite $9 `    "language": "$SetupLanguage",$\r$\n`
  FileWrite $9 `    "layout": "$SetupLayout",$\r$\n`
  FileWrite $9 `    "theme": "$SetupTheme",$\r$\n`
  FileWrite $9 `    "onboardingCompleted": true$\r$\n`
  FileWrite $9 `  },$\r$\n`
  FileWrite $9 `  "extensionSources": [`

  ${If} $SetupSourcePreset == "tech"
    FileWrite $9 `$\r$\n    "data/local-extension-sources/tech-english-source/manifest.json"$\r$\n`
  ${ElseIf} $SetupSourcePreset == "hardcore"
    FileWrite $9 `$\r$\n    "data/local-extension-sources/hardcore-mode-source/manifest.json"$\r$\n`
  ${ElseIf} $SetupSourcePreset == "all"
    FileWrite $9 `$\r$\n    "data/local-extension-sources/tech-english-source/manifest.json",$\r$\n`
    FileWrite $9 `    "data/local-extension-sources/hardcore-mode-source/manifest.json"$\r$\n`
  ${EndIf}

  FileWrite $9 `  ]$\r$\n`
  FileWrite $9 `}$\r$\n`
  FileClose $9

  setupPreferencesDone:
!macroend

!macro customRemoveFiles
  ${If} $UninstallDeleteUserData == "1"
    SetOutPath $TEMP
    RMDir /r "$INSTDIR"
  ${Else}
    IfFileExists "$INSTDIR\data\*.*" 0 keepDataSkipped
      CreateDirectory "$PLUGINSDIR\typing-trainer-user-data"
      Rename "$INSTDIR\data" "$PLUGINSDIR\typing-trainer-user-data\data"

    keepDataSkipped:
      SetOutPath $TEMP
      RMDir /r "$INSTDIR"

      IfFileExists "$PLUGINSDIR\typing-trainer-user-data\data\*.*" 0 keepDataDone
        CreateDirectory "$INSTDIR"
        Rename "$PLUGINSDIR\typing-trainer-user-data\data" "$INSTDIR\data"

    keepDataDone:
  ${EndIf}
!macroend

!ifndef BUILD_UNINSTALLER
Function TypingTrainerSetupPageCreate
  IfFileExists "$INSTDIR\data\progress.json" 0 +2
    Abort

  Call TypingTrainerDetectTheme

  StrCpy $SetupLocale "ru"
  StrCpy $SetupLanguage "ru"
  StrCpy $SetupLayout "йцукен"
  StrCpy $SetupTheme $InstallerTheme
  StrCpy $SetupSourcePreset "all"

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  Push $0
  Call TypingTrainerStyleDialog

  ${NSD_CreateLabel} 0 0 100% 16u "Typing Trainer"
  Pop $1
  Push $1
  Call TypingTrainerStyleAccent

  ${NSD_CreateLabel} 0 17u 100% 18u "Первичная настройка приложения"
  Pop $1
  Push $1
  Call TypingTrainerStyleTitle

  ${NSD_CreateLabel} 0 40u 100% 26u "Выберите локаль, раскладку, тему и стартовые источники дополнений. Все это можно будет изменить позже в настройках приложения."
  Pop $1
  Push $1
  Call TypingTrainerStyleText

  ${NSD_CreateGroupBox} 0 72u 100% 112u "Настройки первого запуска"
  Pop $1
  Push $1
  Call TypingTrainerStylePanel

  ${NSD_CreateLabel} 12u 91u 42% 10u "Локаль приложения"
  Pop $1
  Push $1
  Call TypingTrainerStyleText
  ${NSD_CreateDropList} 12u 104u 40% 120u ""
  Pop $SetupLocaleDrop
  Push $SetupLocaleDrop
  Call TypingTrainerStyleField
  ${NSD_CB_AddString} $SetupLocaleDrop "Русский"
  ${NSD_CB_AddString} $SetupLocaleDrop "English"
  ${NSD_CB_SelectString} $SetupLocaleDrop "Русский"

  ${NSD_CreateLabel} 56% 91u 40% 10u "Раскладка по умолчанию"
  Pop $1
  Push $1
  Call TypingTrainerStyleText
  ${NSD_CreateDropList} 56% 104u 32% 120u ""
  Pop $SetupLayoutDrop
  Push $SetupLayoutDrop
  Call TypingTrainerStyleField
  ${NSD_CB_AddString} $SetupLayoutDrop "ЙЦУКЕН (Русский)"
  ${NSD_CB_AddString} $SetupLayoutDrop "ЯВЕРТЫ (Русский фонетич.)"
  ${NSD_CB_AddString} $SetupLayoutDrop "QWERTY (English)"
  ${NSD_CB_AddString} $SetupLayoutDrop "Dvorak (English)"
  ${NSD_CB_SelectString} $SetupLayoutDrop "ЙЦУКЕН (Русский)"

  ${NSD_CreateLabel} 12u 136u 42% 10u "Тема приложения"
  Pop $1
  Push $1
  Call TypingTrainerStyleText
  ${NSD_CreateDropList} 12u 149u 40% 120u ""
  Pop $SetupThemeDrop
  Push $SetupThemeDrop
  Call TypingTrainerStyleField
  ${NSD_CB_AddString} $SetupThemeDrop "Dark Orange"
  ${NSD_CB_AddString} $SetupThemeDrop "Catppuccin"
  ${NSD_CB_AddString} $SetupThemeDrop "Nord"
  ${NSD_CB_AddString} $SetupThemeDrop "Monokai"
  ${NSD_CB_AddString} $SetupThemeDrop "Light"
  ${If} $SetupTheme == "catppuccin"
    ${NSD_CB_SelectString} $SetupThemeDrop "Catppuccin"
  ${ElseIf} $SetupTheme == "nord"
    ${NSD_CB_SelectString} $SetupThemeDrop "Nord"
  ${ElseIf} $SetupTheme == "monokai"
    ${NSD_CB_SelectString} $SetupThemeDrop "Monokai"
  ${ElseIf} $SetupTheme == "light"
    ${NSD_CB_SelectString} $SetupThemeDrop "Light"
  ${Else}
    ${NSD_CB_SelectString} $SetupThemeDrop "Dark Orange"
  ${EndIf}

  ${NSD_CreateLabel} 56% 136u 40% 10u "Источники дополнений"
  Pop $1
  Push $1
  Call TypingTrainerStyleText
  ${NSD_CreateDropList} 56% 149u 32% 120u ""
  Pop $SetupSourcesDrop
  Push $SetupSourcesDrop
  Call TypingTrainerStyleField
  ${NSD_CB_AddString} $SetupSourcesDrop "Демо-источники: аддоны, темы, моды"
  ${NSD_CB_AddString} $SetupSourcesDrop "Только Tech English"
  ${NSD_CB_AddString} $SetupSourcesDrop "Только Hardcore Mode"
  ${NSD_CB_AddString} $SetupSourcesDrop "Не добавлять сейчас"
  ${NSD_CB_SelectString} $SetupSourcesDrop "Демо-источники: аддоны, темы, моды"

  ${NSD_CreateGroupBox} 0 192u 100% 60u "Что включено"
  Pop $1
  Push $1
  Call TypingTrainerStylePanel
  ${NSD_CreateLabel} 12u 208u 88% 34u "Адаптивные тренировки, уроки, спринт, выживание, безошибочный режим, roguelike-режим, статистика, темы, аддоны, моды и внешние каталоги расширений."
  Pop $1
  Push $1
  Call TypingTrainerStyleText

  nsDialogs::Show
FunctionEnd

Function TypingTrainerSetupPageLeave
  ${NSD_GetText} $SetupLocaleDrop $0
  ${If} $0 == "English"
    StrCpy $SetupLocale "en"
    StrCpy $SetupLanguage "en"
  ${Else}
    StrCpy $SetupLocale "ru"
    StrCpy $SetupLanguage "ru"
  ${EndIf}

  ${NSD_GetText} $SetupLayoutDrop $0
  ${If} $0 == "QWERTY (English)"
    StrCpy $SetupLanguage "en"
    StrCpy $SetupLayout "qwerty"
  ${ElseIf} $0 == "Dvorak (English)"
    StrCpy $SetupLanguage "en"
    StrCpy $SetupLayout "dvorak"
  ${ElseIf} $0 == "ЯВЕРТЫ (Русский фонетич.)"
    StrCpy $SetupLanguage "ru"
    StrCpy $SetupLayout "яверты"
  ${Else}
    StrCpy $SetupLanguage "ru"
    StrCpy $SetupLayout "йцукен"
  ${EndIf}

  ${NSD_GetText} $SetupThemeDrop $0
  ${If} $0 == "Catppuccin"
    StrCpy $SetupTheme "catppuccin"
  ${ElseIf} $0 == "Nord"
    StrCpy $SetupTheme "nord"
  ${ElseIf} $0 == "Monokai"
    StrCpy $SetupTheme "monokai"
  ${ElseIf} $0 == "Light"
    StrCpy $SetupTheme "light"
  ${Else}
    StrCpy $SetupTheme "dark-orange"
  ${EndIf}

  ${NSD_GetText} $SetupSourcesDrop $0
  ${If} $0 == "Только Tech English"
    StrCpy $SetupSourcePreset "tech"
  ${ElseIf} $0 == "Только Hardcore Mode"
    StrCpy $SetupSourcePreset "hardcore"
  ${ElseIf} $0 == "Не добавлять сейчас"
    StrCpy $SetupSourcePreset "none"
  ${Else}
    StrCpy $SetupSourcePreset "all"
  ${EndIf}
FunctionEnd
!endif

!ifdef BUILD_UNINSTALLER
Function un.TypingTrainerUninstallPageCreate
  Call un.TypingTrainerDetectTheme

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  Push $0
  Call un.TypingTrainerStyleDialog

  ${NSD_CreateLabel} 0 0 100% 16u "Typing Trainer"
  Pop $1
  Push $1
  Call un.TypingTrainerStyleAccent

  ${NSD_CreateLabel} 0 17u 100% 18u "Удалить приложение?"
  Pop $1
  Push $1
  Call un.TypingTrainerStyleTitle

  ${NSD_CreateLabel} 0 42u 100% 34u "Файлы приложения будут удалены. Локальные данные, установленные расширения, темы и статистика по умолчанию сохраняются."
  Pop $1
  Push $1
  Call un.TypingTrainerStyleText

  ${NSD_CreateGroupBox} 0 86u 100% 72u "Данные пользователя"
  Pop $1
  Push $1
  Call un.TypingTrainerStylePanel
  ${NSD_CreateCheckbox} 12u 106u 88% 16u "Удалить пользовательские данные, расширения, темы и статистику"
  Pop $UninstallDeleteUserDataCheckbox
  Push $UninstallDeleteUserDataCheckbox
  Call un.TypingTrainerStyleField
  ${If} $UninstallDeleteUserData == "1"
    ${NSD_Check} $UninstallDeleteUserDataCheckbox
  ${EndIf}
  ${NSD_CreateLabel} 12u 130u 88% 18u "Этот пункт необратим: вместе с данными исчезнут прогресс и локальные пакеты."
  Pop $1
  Push $1
  Call un.TypingTrainerStyleText

  ${NSD_CreateLabel} 0 176u 100% 18u "Если сомневаетесь, оставьте данные: приложение можно установить заново и продолжить с того же места."
  Pop $1
  Push $1
  Call un.TypingTrainerStyleText

  nsDialogs::Show
FunctionEnd

Function un.TypingTrainerUninstallPageLeave
  ${NSD_GetState} $UninstallDeleteUserDataCheckbox $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $UninstallDeleteUserData "1"
  ${Else}
    StrCpy $UninstallDeleteUserData "0"
  ${EndIf}
FunctionEnd
!endif
