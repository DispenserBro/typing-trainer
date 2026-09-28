!include nsDialogs.nsh
!include LogicLib.nsh

; Use the standard NSIS wizard and system colors.
; Keep only the explicit user-data choice when uninstalling.
!ifdef BUILD_UNINSTALLER
Var UninstallDeleteUserData
Var UninstallDeleteUserDataCheckbox
!endif

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

!ifdef BUILD_UNINSTALLER
Function un.TypingTrainerUninstallPageCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 16u "Typing Trainer"
  Pop $1

  ${NSD_CreateLabel} 0 17u 100% 18u "Удалить приложение?"
  Pop $1

  ${NSD_CreateLabel} 0 38u 100% 26u "Файлы приложения будут удалены. Локальные данные, установленные расширения, темы и статистика по умолчанию сохраняются."
  Pop $1

  ${NSD_CreateGroupBox} 0 72u 100% 64u "Данные пользователя"
  Pop $1
  ${NSD_CreateCheckbox} 12u 87u 88% 20u "Удалить пользовательские данные, расширения, темы и статистику"
  Pop $UninstallDeleteUserDataCheckbox
  ${If} $UninstallDeleteUserData == "1"
    ${NSD_Check} $UninstallDeleteUserDataCheckbox
  ${EndIf}
  ${NSD_CreateLabel} 12u 111u 88% 20u "Этот пункт необратим: вместе с данными исчезнут прогресс и локальные пакеты."
  Pop $1

  ${NSD_CreateLabel} 0 144u 100% 24u "Если сомневаетесь, оставьте данные: приложение можно установить заново и продолжить с того же места."
  Pop $1

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
