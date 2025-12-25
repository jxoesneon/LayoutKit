require("dotenv").config();
const ICONS_DIR = "build/";

const windowsOS = {
    win: {
        icon: ICONS_DIR + "icon.ico",
        target: "nsis",
    },

    nsis: {
        differentialPackage: true,
        perMachine: true,
        oneClick: false,
        allowToChangeInstallationDirectory: true,
    },
};

const macOS = {
    mac: {
        icon: ICONS_DIR + "icon.icns",
        target: ["dmg"],
        minimumSystemVersion: "11.7.10",
    },
};

module.exports = {
    productName: "LayoutKit",
    appId: "net.themezer.layoutkit",
    artifactName: "${productName}-${version}.${ext}",
    directories: {
        output: "build",
    },
    publish: {
        provider: "github",
        token: process.env.GITHUB_ACCESS_TOKEN
    },
    files: [
        "package.json",
        {
            from: "dist/main/",
            to: "dist/main/",
        },
        {
            from: "dist/renderer",
            to: "dist/renderer/",
        },
    ],
    extraResources: [
        {
            from: "external/SwitchThemeInjector/SwitchThemes.CLI/bin/Release/net8.0/osx-x64/publish",
            to: "tools/switchthemes-cli/",
        },
        {
            from: "external/SwitchThemeInjector/SwitchThemes.CLI/bin/Release/net8.0/osx-arm64/publish",
            to: "tools/switchthemes-cli-arm64/",
        },
        {
            from: "external/SARC-Tool",
            to: "tools/sarc-tool/",
            filter: ["main.py", "README.md", "LICENSE", ".gitignore", "Pipfile", "Pipfile.lock"],
        },
        {
            from: "external/Switch-Toolbox.Avalonia/bin/Release/net8.0/osx-x64/publish",
            to: "tools/toolbox-avalonia/",
        },
        {
            from: "external/Switch-Toolbox.Avalonia/bin/Release/net8.0/osx-arm64/publish",
            to: "tools/toolbox-avalonia-arm64/",
        },
        {
            from: "external/SwitchLayoutEditor.Avalonia/bin/Release/net8.0/osx-x64/publish",
            to: "tools/layouteditor-avalonia/",
        },
        {
            from: "external/SwitchLayoutEditor.Avalonia/bin/Release/net8.0/osx-arm64/publish",
            to: "tools/layouteditor-avalonia-arm64/",
        },
    ],
    asarUnpack: [
        "**/node_modules/7zip-bin/**/*"
    ],
    ...windowsOS,
    ...macOS,
};
