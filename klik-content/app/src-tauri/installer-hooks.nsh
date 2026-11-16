; Close a running Klik Content so updates and uninstalls never fail with locked
; files. Only Klik Content: the separate Klik app and its klik-mcp are left alone.

!macro KLIK_CONTENT_CLOSE_RUNNING
  nsExec::Exec '"$SYSDIR\taskkill.exe" /F /T /IM klik-content.exe'
  Pop $0
  Sleep 500
!macroend

!macro NSIS_HOOK_PREINSTALL
  !insertmacro KLIK_CONTENT_CLOSE_RUNNING
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro KLIK_CONTENT_CLOSE_RUNNING
!macroend
