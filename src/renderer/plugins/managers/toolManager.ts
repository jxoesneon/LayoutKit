import * as fs from "fs";
import * as path from "path";
import {
    FIRMWARES_DIR,
    getFiles,
    LAYOUTEDITOR_DIR,
    LAYOUTEDITOR_EXE,
    PROJECTS_DIR,
    SARCTOOL_DIR,
    SARCTOOL_EXE,
    THEMEINJECTOR_DIR,
    THEMEINJECTOR_EXE,
    TOOLBOX_DIR,
    TOOLBOX_EXE,
    TOOLS_DIR,
    VERSION_CFG,
} from "./managerUtils";
import axios from "axios";
import Downloader from "nodejs-file-downloader";
import editJsonFile from "edit-json-file";
import {execFile, spawn} from "child_process";
// 'spawn' if the program stays open, 'execFile' if it exits automatically
import {toNice} from "@themezernx/target-parser/dist";
import log from "electron-log";
import * as sevenBin from "7zip-bin";
import {extractFull} from "node-7z";

const toolLog = log.scope("toolManager");
const pathTo7zip = sevenBin.path7za.replace("app.asar", "app.asar.unpacked"); // fix asar issues
const isMac = process.platform === "darwin";
const isArm64 = process.arch === "arm64";

const UPDATE_MESSAGE_TIMEOUT = 300;

export default (context: any, inject: any) => {
    const getMonoPath = (): string => {
        if (!isMac) return "mono";
        const candidates = [
            "/Library/Frameworks/Mono.framework/Versions/Current/Commands/mono",
            "/usr/local/bin/mono",
            "/opt/homebrew/bin/mono",
        ];
        for (const p of candidates) {
            try {
                if (fs.existsSync(p)) return p;
            } catch (_e) {
                // ignore
            }
        }
        return "mono";
    };
    const getThemeInjectorNativeCliPath = (): string | null => {
        if (!isMac) return null;
        const candidates: string[] = [];
        if (isArm64) {
            candidates.push(
                path.resolve(process.cwd(), "external/SwitchThemeInjector/SwitchThemes.CLI/bin/Release/net8.0/osx-arm64/publish/SwitchThemes.CLI"),
                path.resolve(process.cwd(), "external/SwitchThemeInjector/SwitchThemes.CLI/bin/Debug/net8.0/osx-arm64/publish/SwitchThemes.CLI"),
                path.resolve(process.cwd(), "external/SwitchThemeInjector/SwitchThemes.CLI/bin/Release/net8.0/osx-x64/publish/SwitchThemes.CLI"),
                path.resolve(process.cwd(), "external/SwitchThemeInjector/SwitchThemes.CLI/bin/Debug/net8.0/osx-x64/publish/SwitchThemes.CLI"),
            );
        } else {
            candidates.push(
                path.resolve(process.cwd(), "external/SwitchThemeInjector/SwitchThemes.CLI/bin/Release/net8.0/osx-x64/publish/SwitchThemes.CLI"),
                path.resolve(process.cwd(), "external/SwitchThemeInjector/SwitchThemes.CLI/bin/Debug/net8.0/osx-x64/publish/SwitchThemes.CLI"),
                path.resolve(process.cwd(), "external/SwitchThemeInjector/SwitchThemes.CLI/bin/Release/net8.0/osx-arm64/publish/SwitchThemes.CLI"),
                path.resolve(process.cwd(), "external/SwitchThemeInjector/SwitchThemes.CLI/bin/Debug/net8.0/osx-arm64/publish/SwitchThemes.CLI"),
            );
        }
        try {
            const rp = (process as any).resourcesPath;
            if (isArm64) {
                candidates.push(
                    path.join(rp, "tools", "switchthemes-cli-arm64", "SwitchThemes.CLI"),
                    path.join(rp, "app.asar.unpacked", "tools", "switchthemes-cli-arm64", "SwitchThemes.CLI"),
                    path.join(rp, "tools", "switchthemes-cli", "SwitchThemes.CLI"),
                    path.join(rp, "app.asar.unpacked", "tools", "switchthemes-cli", "SwitchThemes.CLI"),
                );
            } else {
                candidates.push(
                    path.join(rp, "tools", "switchthemes-cli", "SwitchThemes.CLI"),
                    path.join(rp, "app.asar.unpacked", "tools", "switchthemes-cli", "SwitchThemes.CLI"),
                    path.join(rp, "tools", "switchthemes-cli-arm64", "SwitchThemes.CLI"),
                    path.join(rp, "app.asar.unpacked", "tools", "switchthemes-cli-arm64", "SwitchThemes.CLI"),
                );
            }
        } catch (_e) {
        }
        for (const p of candidates) {
            try {
                if (fs.existsSync(p)) return p;
            } catch (_e) {
                // ignore
            }
        }
        return null;
    };
    const getNativeEditorAppPath = (which: "toolbox" | "layouteditor"): string | null => {
        if (!isMac) return null;
        const candidates: string[] = [];
        if (which === "toolbox") {
            if (isArm64) {
                candidates.push(
                    path.resolve(process.cwd(), "external/Switch-Toolbox.Avalonia/bin/Release/net8.0/osx-arm64/publish/Switch-Toolbox.Avalonia"),
                    path.resolve(process.cwd(), "external/Switch-Toolbox.Avalonia/bin/Release/net8.0/osx-x64/publish/Switch-Toolbox.Avalonia"),
                );
            } else {
                candidates.push(
                    path.resolve(process.cwd(), "external/Switch-Toolbox.Avalonia/bin/Release/net8.0/osx-x64/publish/Switch-Toolbox.Avalonia"),
                    path.resolve(process.cwd(), "external/Switch-Toolbox.Avalonia/bin/Release/net8.0/osx-arm64/publish/Switch-Toolbox.Avalonia"),
                );
            }
        } else {
            if (isArm64) {
                candidates.push(
                    path.resolve(process.cwd(), "external/SwitchLayoutEditor.Avalonia/bin/Release/net8.0/osx-arm64/publish/SwitchLayoutEditor.Avalonia"),
                    path.resolve(process.cwd(), "external/SwitchLayoutEditor.Avalonia/bin/Release/net8.0/osx-x64/publish/SwitchLayoutEditor.Avalonia"),
                );
            } else {
                candidates.push(
                    path.resolve(process.cwd(), "external/SwitchLayoutEditor.Avalonia/bin/Release/net8.0/osx-x64/publish/SwitchLayoutEditor.Avalonia"),
                    path.resolve(process.cwd(), "external/SwitchLayoutEditor.Avalonia/bin/Release/net8.0/osx-arm64/publish/SwitchLayoutEditor.Avalonia"),
                );
            }
        }
        try {
            const rp = (process as any).resourcesPath;
            if (which === "toolbox") {
                if (isArm64) {
                    candidates.push(
                        path.join(rp, "tools", "toolbox-avalonia-arm64", "Switch-Toolbox.Avalonia"),
                        path.join(rp, "app.asar.unpacked", "tools", "toolbox-avalonia-arm64", "Switch-Toolbox.Avalonia"),
                        path.join(rp, "tools", "toolbox-avalonia", "Switch-Toolbox.Avalonia"),
                        path.join(rp, "app.asar.unpacked", "tools", "toolbox-avalonia", "Switch-Toolbox.Avalonia"),
                    );
                } else {
                    candidates.push(
                        path.join(rp, "tools", "toolbox-avalonia", "Switch-Toolbox.Avalonia"),
                        path.join(rp, "app.asar.unpacked", "tools", "toolbox-avalonia", "Switch-Toolbox.Avalonia"),
                        path.join(rp, "tools", "toolbox-avalonia-arm64", "Switch-Toolbox.Avalonia"),
                        path.join(rp, "app.asar.unpacked", "tools", "toolbox-avalonia-arm64", "Switch-Toolbox.Avalonia"),
                    );
                }
            } else {
                if (isArm64) {
                    candidates.push(
                        path.join(rp, "tools", "layouteditor-avalonia-arm64", "SwitchLayoutEditor.Avalonia"),
                        path.join(rp, "app.asar.unpacked", "tools", "layouteditor-avalonia-arm64", "SwitchLayoutEditor.Avalonia"),
                        path.join(rp, "tools", "layouteditor-avalonia", "SwitchLayoutEditor.Avalonia"),
                        path.join(rp, "app.asar.unpacked", "tools", "layouteditor-avalonia", "SwitchLayoutEditor.Avalonia"),
                    );
                } else {
                    candidates.push(
                        path.join(rp, "tools", "layouteditor-avalonia", "SwitchLayoutEditor.Avalonia"),
                        path.join(rp, "app.asar.unpacked", "tools", "layouteditor-avalonia", "SwitchLayoutEditor.Avalonia"),
                        path.join(rp, "tools", "layouteditor-avalonia-arm64", "SwitchLayoutEditor.Avalonia"),
                        path.join(rp, "app.asar.unpacked", "tools", "layouteditor-avalonia-arm64", "SwitchLayoutEditor.Avalonia"),
                    );
                }
            }
        } catch (_e) {
        }
        for (const p of candidates) {
            try {
                if (fs.existsSync(p)) return p;
            } catch (_e) {
            }
        }
        return null;
    };
    const getPipenvPath = (): string => {
        const candidates = [
            "/opt/homebrew/bin/pipenv",
            "/usr/local/bin/pipenv",
            "pipenv",
        ];
        for (const p of candidates) {
            try {
                if (fs.existsSync(p)) return p;
            } catch (_e) {
            }
        }
        return "pipenv";
    };
    const getSarcToolDirs = (userDataPath: string): string[] => {
        const dirs: string[] = [];
        dirs.push(path.resolve(process.cwd(), "external/SARC-Tool"));
        try {
            const rp = (process as any).resourcesPath;
            dirs.push(path.join(rp, "tools", "sarc-tool"));
            dirs.push(path.join(rp, "app.asar.unpacked", "tools", "sarc-tool"));
        } catch (_e) {
        }
        dirs.push(path.join(userDataPath, TOOLS_DIR, SARCTOOL_DIR, "sarc-tool"));
        return dirs;
    };
    const setUpdateMessage = (message: string) => {
        toolLog.info(message);
        context.store.commit("CHECKING_FOR_TOOL_UPDATES_MESSAGE", message);
    };
    const fetchLatestAsset = (toolDir, toolName, {
        url,
        expectedMimeTypes,
        assetNameContains,
        directUrl,
        directVersion,
    }) => {
        return new Promise((resolve) => {
            toolLog.info(`[${toolName}] Checking for updates...`);
            fs.readFile(path.join(toolDir, VERSION_CFG), "utf8", async (err, versionString) => {
                let currentVersion = versionString;
                if (err || isNaN(Number(currentVersion))) currentVersion = String(0);

                try {
                    let asset: { url: string | null; version: string | null; name: string | null } = {
                        url: null,
                        version: null,
                        name: null,
                    };

                    if (url) {
                        // GitHub
                        const res = await axios.get(url);
                        const releases = res.data;
                        if (releases?.length > 0) {
                            const githubAsset = res.data[0]["assets"].find((a) =>
                                expectedMimeTypes.includes(a.content_type)  &&
                                (assetNameContains ? a.name.includes(assetNameContains) : true),
                            );
                            asset.url = githubAsset?.browser_download_url ?? null;
                            asset.name = githubAsset?.name ?? null;
                            asset.version = githubAsset?.updated_at ? new Date(githubAsset.updated_at).getTime().toString() : null;
                        } else {
                            toolLog.warn(`[${toolName}] No releases found`);
                            resolve(null);
                        }
                    } else if (directUrl) {
                        // Direct link
                        asset.url = directUrl;
                        asset.name = path.basename(directUrl);
                        asset.version = directVersion;
                    }

                    // Ensure asset.name is set if URL is present
                    if (asset.url && !asset.name) {
                        try {
                            asset.name = path.basename(new URL(asset.url).pathname);
                        } catch (_e) {
                            asset.name = path.basename(asset.url);
                        }
                    }

                    const hasUpdate = asset.url !== null && asset.version !== null && Number(currentVersion) < Number(asset.version);
                    if (hasUpdate) {
                        setUpdateMessage(`[${toolName}] Downloading update...`);
                        setTimeout(async () => {
                            const downloader = new Downloader({
                                url: asset.url as string,
                                directory: toolDir,
                                cloneFiles: false,
                            });

                            const zipPath = path.join(toolDir, asset.name as string);
                            try {
                                await downloader.download();
                                setUpdateMessage(`[${toolName}] Download done, unpacking...`);
                                const unzip = extractFull(zipPath, toolDir, {
                                    $bin: pathTo7zip,
                                });

                                const unzipPromise = new Promise((resolve, reject) => {
                                    unzip.on("end", resolve);
                                    unzip.on("error", reject);
                                });

                                await unzipPromise;

                                // Save version
                                if (asset.version) fs.writeFileSync(path.join(toolDir, VERSION_CFG), asset.version);

                                setUpdateMessage(`[${toolName}] Update completed!`);
                                setTimeout(() => {
                                    resolve(null);
                                }, UPDATE_MESSAGE_TIMEOUT);
                            } catch (e) {
                                toolLog.error(e);
                                setUpdateMessage(`[${toolName}] Download failed!`);
                                setTimeout(() => {
                                    resolve(null);
                                }, UPDATE_MESSAGE_TIMEOUT + 200);
                            } finally {
                                // Finally trash downloaded archive
                                if (asset.name) {
                                    await context.$ipcService.fs.trash([zipPath]);
                                }
                            }
                        }, UPDATE_MESSAGE_TIMEOUT);
                    } else {
                        toolLog.info(`[${toolName}] No update found`);
                        resolve(null);
                    }
                } catch (e) {
                    toolLog.error(e);
                    setUpdateMessage(`[${toolName}] Could not check for updates`);
                    setTimeout(() => {
                        resolve(null);
                    }, UPDATE_MESSAGE_TIMEOUT);
                }
            });
        });
    };

    const $toolManager = {
        async updateSarcTool() {
            const userDataPath = await context.$ipcService.fs.getUserDataPath();
            const directory = path.join(userDataPath, TOOLS_DIR, SARCTOOL_DIR);
            const url = "https://api.github.com/repos/aboood40091/SARC-Tool/releases";

            await fetchLatestAsset(
                directory,
                SARCTOOL_DIR,
                {
                    url,
                    expectedMimeTypes: ["application/x-zip-compressed", "application/zip"],
                    assetNameContains: null,
                    directUrl: null,
                    directVersion: null,
                },
            );
        },
        async updateThemeInjector() {
            const userDataPath = await context.$ipcService.fs.getUserDataPath();
            const directory = path.join(userDataPath, TOOLS_DIR, THEMEINJECTOR_DIR);
            const url = "https://api.github.com/repos/exelix11/SwitchThemeInjector/releases";
            await fetchLatestAsset(
                directory,
                THEMEINJECTOR_DIR,
                {
                    url,
                    expectedMimeTypes: ["application/x-zip-compressed", "application/zip"],
                    assetNameContains: ".zip",
                    directUrl: null,
                    directVersion: null,
                },
            );
        },
        async updateToolbox() {
            const userDataPath = await context.$ipcService.fs.getUserDataPath();
            const directory = path.join(userDataPath, TOOLS_DIR, TOOLBOX_DIR);
            const url = "https://api.github.com/repos/KillzXGaming/Switch-Toolbox/releases";

            await fetchLatestAsset(
                directory,
                TOOLBOX_DIR,
                {
                    url,
                    expectedMimeTypes: ["application/x-zip-compressed", "application/zip"],
                    assetNameContains: null,
                    directUrl: null,
                    directVersion: null,
                },
            );
        },
        async updateLayoutEditor() {
            const userDataPath = await context.$ipcService.fs.getUserDataPath();
            const directory = path.join(userDataPath, TOOLS_DIR, LAYOUTEDITOR_DIR);
            const url = "https://api.github.com/repos/FuryBaguette/SwitchLayoutEditor/releases";

            await fetchLatestAsset(
                directory,
                LAYOUTEDITOR_DIR,
                {
                    url,
                    expectedMimeTypes: ["application/x-zip-compressed", "application/zip"],
                    assetNameContains: null,
                    directUrl: null,
                    directVersion: null,
                },
            );
        },
        async updateAllTools() {
            // await $toolManager.updateSarcTool();
            await $toolManager.updateThemeInjector();
            await $toolManager.updateToolbox();
            await $toolManager.updateLayoutEditor();
            context.store.commit("CHECKING_FOR_TOOL_UPDATES_MESSAGE", "");
        },
        szs: {
            getExePath(userDataPath: string) {
                const base = path.join(userDataPath, TOOLS_DIR, SARCTOOL_DIR, SARCTOOL_EXE);
                if (isMac) {
                    const exe = base + ".exe";
                    return fs.existsSync(exe) ? exe : base;
                }
                return base;
            },
            run(args: string[], cb: (err: any, stdout: string, stderr: string) => void, userDataPath: string) {
                const exePath = this.getExePath(userDataPath);
                if (isMac) {
                    const dirs = getSarcToolDirs(userDataPath);
                    const pipenv = getPipenvPath();
                    for (const d of dirs) {
                        const mainPy = path.join(d, "main.py");
                        try {
                            if (fs.existsSync(mainPy)) {
                                execFile(pipenv, ["run", "python3", "-c", "import SarcLib, libyaz0"], {cwd: d}, (testErr) => {
                                    if (testErr) {
                                        execFile(pipenv, ["install", "libyaz0", "SarcLib"], {cwd: d}, (_iErr) => {
                                            execFile(pipenv, ["run", "python3", "main.py", ...args], {cwd: d}, cb);
                                        });
                                    } else {
                                        execFile(pipenv, ["run", "python3", "main.py", ...args], {cwd: d}, cb);
                                    }
                                });
                                return;
                            }
                        } catch (_e) {
                        }
                    }
                    const hint = "Native SARC-Tool is not set up. In external/SARC-Tool run: pipenv install libyaz0 SarcLib";
                    toolLog.error(hint);
                    context.$popup.error(new Error(hint));
                    cb(new Error(hint), "", "");
                } else {
                    execFile(exePath, args, cb);
                }
            },
            unpack(filePath) {
                return new Promise(async (resolve) => {
                    const userDataPath = await context.$ipcService.fs.getUserDataPath();
                    // Unpack the szs next to the original file
                    this.run([filePath], () => resolve(null), userDataPath);
                });
            },
            pack(originDir, destFile) {
                return new Promise(async (resolve) => {
                    const userDataPath = await context.$ipcService.fs.getUserDataPath();
                    // Pack folder into SZS
                    this.run(["-little", "-compress", "0", "-o", destFile, originDir], () => resolve(null), userDataPath);
                });
            },
        },
        editor: {
            getEditorExe(userDataPath: string, which: "toolbox" | "layouteditor") {
                if (which === "toolbox") {
                    const base = path.join(userDataPath, TOOLS_DIR, TOOLBOX_DIR, TOOLBOX_EXE);
                    if (isMac) {
                        const exe = base + ".exe";
                        return fs.existsSync(exe) ? exe : base;
                    }
                    return base;
                }
                const base = path.join(userDataPath, TOOLS_DIR, LAYOUTEDITOR_DIR, LAYOUTEDITOR_EXE);
                if (isMac) {
                    const exe = base + ".exe";
                    return fs.existsSync(exe) ? exe : base;
                }
                return base;
            },
            open() {
                return this.openPaths([]); // quick solution
            },
            openPaths(paths: Array<string>, awaitClose: boolean = false) {
                return new Promise(async (resolve) => {
                    const userDataPath = await context.$ipcService.fs.getUserDataPath();
                    let editorWorkingDir, editorPath;
                    if (context.store.state.settings.preferredEditor === "toolbox") {
                        if (isMac) {
                            const nativePath = getNativeEditorAppPath("toolbox");
                            if (nativePath) {
                                editorWorkingDir = path.dirname(nativePath);
                                editorPath = nativePath;
                            }
                        } else {
                            editorWorkingDir = path.join(userDataPath, TOOLS_DIR, TOOLBOX_DIR);
                            editorPath = this.getEditorExe(userDataPath, "toolbox");
                        }
                    } else if (context.store.state.settings.preferredEditor === "layouteditor") {
                        if (isMac) {
                            const nativePath = getNativeEditorAppPath("layouteditor");
                            if (nativePath) {
                                editorWorkingDir = path.dirname(nativePath);
                                editorPath = nativePath;
                            }
                        } else {
                            editorWorkingDir = path.join(userDataPath, TOOLS_DIR, LAYOUTEDITOR_DIR);
                            editorPath = this.getEditorExe(userDataPath, "layouteditor");
                        }
                    }
                    if (isMac && !editorPath) {
                        context.$popup.error(new Error("Native editors not found yet. Build them or use Windows/Wine. CLI tools remain available."));
                        resolve(null);
                        return;
                    }

                    const argv = paths && paths.length > 0 ? [paths[0]] : [];
                    const ls = spawn(editorPath, argv, {cwd: editorWorkingDir});
                    ls.on("error", (err: any) => {
                        toolLog.error(err);
                        context.$popup.error(new Error("Failed to launch external editor. Check logs for details."));
                    });
                    ls.stdout.on("error", (data) => {
                        toolLog.error(String(data));
                    });
                    // If this "on data" is not here, the switch-toolbox will freeze when for example opening RdtBase.bflyt
                    ls.stdout.on("data", () => {
                    });
                    ls.stderr.on("data", (data) => {
                        toolLog.error(String(data));
                    });
                    ls.on("close", (code) => {
                        toolLog.info(`External editor exited with code ${code}`);
                    });

                    if (awaitClose) {
                        ls.stdout.on("end", () => {
                            resolve(null);
                        });
                    } else {
                        setTimeout(() => {
                            resolve(null);
                        }, 500);
                    }
                });
            },
            async openFolder(dirPath, awaitClose: boolean = false) {
                const filePaths = getFiles(dirPath)
                    .map((f) => path.join(dirPath, f));
                await this.openPaths(filePaths, awaitClose);
            },
            async openProjectFiles(projectId: string, files: Array<string>) {
                const userDataPath = await context.$ipcService.fs.getUserDataPath();
                const filePaths = files.map((f) => path.join(userDataPath, PROJECTS_DIR, projectId, f));
                await this.openPaths(filePaths, true);
            },
            async openProjectFolder(projectId) {
                const userDataPath = await context.$ipcService.fs.getUserDataPath();
                const projectPath = path.join(userDataPath, PROJECTS_DIR, projectId);
                await this.openFolder(projectPath, true);
            },
        },
        layoutinjector: {
            getExePath(userDataPath: string) {
                // On mac, the extracted binary is a Windows .exe; we run it via mono.
                // The constant THEMEINJECTOR_EXE is "SwitchThemes" on mac (no extension).
                const base = path.join(userDataPath, TOOLS_DIR, THEMEINJECTOR_DIR, THEMEINJECTOR_EXE);
                if (isMac) {
                    const nativeCli = getThemeInjectorNativeCliPath();
                    if (nativeCli) return nativeCli;
                    const nativeCliInUserData = path.join(userDataPath, TOOLS_DIR, THEMEINJECTOR_DIR, "SwitchThemes.CLI");
                    if (fs.existsSync(nativeCliInUserData)) return nativeCliInUserData;
                    const exe = base + ".exe";
                    return fs.existsSync(exe) ? exe : base;
                }
                return base;
            },
            run(args: string[], cb: (err: any, stdout: string, stderr: string) => void, userDataPath: string) {
                const exePath = this.getExePath(userDataPath);
                if (isMac) {
                    if (exePath.endsWith(".exe")) {
                        const hint = "Native SwitchThemes CLI not found. Build it with: dotnet publish external/SwitchThemeInjector/SwitchThemes.CLI/SwitchThemes.CLI.csproj -c Release -r osx-x64 -p:PublishSingleFile=true -p:SelfContained=true";
                        toolLog.error(hint);
                        context.$popup.error(new Error(hint));
                        cb(new Error(hint), "", "");
                        return;
                    }
                    execFile(exePath, args, cb);
                } else {
                    execFile(exePath, args, cb);
                }
            },
            createLayoutJson(projectId: string, fileName: string) {
                return new Promise(async (resolve) => {
                    const userDataPath = await context.$ipcService.fs.getUserDataPath();
                    const layoutinjectorPath = this.getExePath(userDataPath);

                    const stockPath = path.join(userDataPath, FIRMWARES_DIR, context.store.state.activeProject.firmware, fileName);
                    const filePath = path.join(userDataPath, PROJECTS_DIR, projectId, fileName);
                    const newFileName = `${context.store.state.activeProject.name} (${toNice(fileName)})`;
                    // Unpack the szs next to the original file
                    try {
                        const savePath = await context.$ipcService.fs.selectSaveLocation("Select save location for layout", newFileName + ".json", "Layout JSON", "json");
                        if (savePath?.length > 0) {
                            this.run(["diff", stockPath, filePath, savePath], (_err, stdout, stderr) => {
                                // ^ diff <original szs file> <modified szs file> <output json path>
                                if (stdout) toolLog.info(stdout);
                                if (stderr?.trim().length > 0) {
                                    toolLog.error(stderr);
                                    context.$popup.error(new Error(stderr.trim()));
                                } else {
                                    // Prettify the json
                                    const json: any = editJsonFile(savePath, {stringify_width: 4});
                                    json.set("PatchName", newFileName);
                                    json.save();
                                }
                                resolve(null);
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        toolLog.error(e);
                        resolve(null);
                    }
                });
            },
            applyLayoutJson(projectId: string, fileName: string) {
                return new Promise(async (resolve) => {
                    const userDataPath = await context.$ipcService.fs.getUserDataPath();
                    const layoutinjectorPath = this.getExePath(userDataPath);

                    const filePath = path.join(userDataPath, PROJECTS_DIR, projectId, fileName);
                    try {
                        const layoutFile = await context.$ipcService.fs.selectLayoutFile();
                        if (layoutFile?.length > 0) {
                            toolLog.info("Applying layout json:", layoutinjectorPath, ["szs", filePath, layoutFile, `out=${filePath}`].join(" "));
                            this.run(["szs", filePath, layoutFile, `out=${filePath}`], (_err, stdout, stderr) => {
                                // ^ szs <input szs file> <layout json> <out=outfile.szs>
                                if (stdout) toolLog.info(stdout);
                                if (stderr) {
                                    toolLog.error(stderr);
                                    context.$popup.error(new Error(stderr.trim()));
                                }
                                resolve(null);
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        toolLog.error(e);
                        resolve(null);
                    }
                });
            },
        },
    };

    // Check for updates on boot
    if (context.store.state.settings.checkToolUpdatesOnLaunch) {
        $toolManager.updateAllTools().then();
    }

    inject("toolManager", $toolManager);
    context.$toolManager = $toolManager;
}
