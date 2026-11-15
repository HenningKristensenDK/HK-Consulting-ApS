; Close running Klik processes so updates and uninstalls never fail with
; "Unable to uninstall" or locked files. klik-mcp.exe may be held by Claude;
; Claude starts it again when it needs it.

!macro KLIK_CLOSE_RUNNING
  nsExec::Exec '"$SYSDIR\taskkill.exe" /F /T /IM klik.exe'
  Pop $0
  nsExec::Exec '"$SYSDIR\taskkill.exe" /F /T /IM klik-mcp.exe'
  Pop $0
  Sleep 500
!macroend

!macro NSIS_HOOK_PREINSTALL
  !insertmacro KLIK_CLOSE_RUNNING
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro KLIK_CLOSE_RUNNING
!macroend
