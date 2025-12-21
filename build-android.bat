@echo off
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=C:\Users\rashe\AppData\Local\Android\Sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%

echo Building Pulse Android APK...
echo JAVA_HOME: %JAVA_HOME%
echo ANDROID_HOME: %ANDROID_HOME%

cd /d "%~dp0"
call android\gradlew.bat app:assembleDebug -x lint -x test --configure-on-demand --build-cache

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Build successful!
    echo APK location: android\app\build\outputs\apk\debug\app-debug.apk
) else (
    echo.
    echo Build failed with error code %ERRORLEVEL%
)
