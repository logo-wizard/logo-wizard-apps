import React, {ChangeEvent, useEffect, useRef, useState} from "react";
import {useParams, useSearchParams} from "react-router-dom";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";

import Header from "../../Header/Header";
import {Logo, LogoStatus, Point} from "../../../types/types";
import LogoService from "../../../services/LogoService";

import './style.css';
import "tui-image-editor/dist/tui-image-editor.css";
// @ts-ignore
import ImageEditor from "@toast-ui/react-image-editor";
// const download = require("downloadjs");
import {whiteTheme} from "./editor-theme";
import {Triangle} from "react-loader-spinner";
import {FormGroup} from "react-bootstrap";
import { StyleOption } from "../../Form/FormSteps/StyleStep";
import {NotFound} from "../NotFoundPage/NotFoundPage";

const icona = require("tui-image-editor/dist/svg/icon-a.svg");
const iconb = require("tui-image-editor/dist/svg/icon-b.svg");
const iconc = require("tui-image-editor/dist/svg/icon-c.svg");
const icond = require("tui-image-editor/dist/svg/icon-d.svg");


enum TextMaskTool {
    paint = 'paint',
    erase = 'erase',
}


interface loadImageResult {
    oldWidth: number
    oldHeight: number
    newWidth: number
    newHeight: number
}


const fontArray = [
    "Times New Roman",
    "Arial",
    "Comic Sans MS",
    "Courier New",
    "Impact",
    "Lobster Two",
    "Tahoma",
    "Verdana",
    "Webdings",
    "Wingdings",
];


const mocked_logo: Logo = {
    id: 'logo_id_001',
    created_by: '9cdd727a-58d0-4508-85f1-bae9ea7ef82d',
    title: 'Name name',
    is_public: true,
    status: LogoStatus.ready,
    link: 'https://storage.yandexcloud.net/s3-logo/BAKEY.jpg'
}


const COLOR_IMG_CANVAS_W = 512;
const COLOR_IMG_CANVAS_H = 512;
const GAMUT_CANVAS_W = 128;
const GAMUT_CANVAS_H = 128;
const POINT_SIZE = 8;
const REMOVE_POINT_EPS = 4;
const ADD_POINT_EPS = 8;
const POINT_LINE_W = 1;
const ACTIVE_POINT_LINE_W = 3;


const styleOptions: { text: string, value: string }[] = [
    {text: 'Минималистичный дизайн', value: 'minimalistic logo style'},
    {text: 'Рисунок карандашом', value: 'pencil drawing logo style'},
    {text: 'Неон', value: 'neon logo style'},
    {text: 'Pixel art', value: 'pixel art logo style'},
    {text: 'Абстракция', value: 'abstract logo style'},
    {text: 'Эмблема', value: 'emblem logo style'},
    {text: 'Винтажный', value: 'vintage logo style'},
    {text: 'Элегантный', value: 'elegant logo style'},
]


const LogoEditorPage = () => {
    const [searchParams, _] = useSearchParams();
    let _DEBUG = false;
    if (searchParams.get('_debug') === '1') {
        _DEBUG = true;
    }

    const {logo_id} = useParams();
    const [logo, setLogo] = useState<Logo>();
    const [loaded, setLoaded] = useState<boolean>(false);
    const [notFound, setNotFound] = useState<boolean>(false);

    const [currentImage, setCurrentImage] = useState<string>();
    const [origImageToColor, setOrigImageToColor] = useState<string>();

    const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const gamutCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const textMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const textMaskBgCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const textMaskToolCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const stylerCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const imgplaceholderRef = useRef<HTMLImageElement | null>(null);

    const [currentGamut, setCurrentGamut] = useState<string | null>(null);
    const [gamutPoints, setGamutPoints] = useState<Point[]>([]);
    const [imagePoints, setImagePoints] = useState<Point[]>([]);
    const [activePoint, setActivePoint] = useState<number | null>(null);
    const [processingRequest, setProcessingRequest] = useState<boolean>(false);
    const [showSwitchTabModal, setShowSwitchTabModal] = useState<boolean>(false);

    const [textImageHistory, setTextImageHistory] = useState<string[]>([]);
    const [showMask, setShowMask] = useState<boolean>(true);
    const [needConfirmToSwitchTab, setNeedConfirmToSwitchTab] = useState<boolean>(false);
    const [nextTab, setNextTab] = useState<string>('');
    const [textToolWidth, setTextToolWidth] = useState<number>(25);
    const [currentStyle, setCurrentStyle] = useState<string>('');
    const [styleImageBackup, setStyleImageBackup] = useState<string | null>(null);

    let textMaskPos: Point = {x: 0, y: 0};
    const [textMaskTool, setTextMaskTool] = useState<TextMaskTool>(TextMaskTool.paint);

    const [activeTab, setActiveTab] = useState("tab1");

    const saveBtnRef = useRef(null);
    const imageEditor = useRef<ImageEditor>();

    const [TUI_selectedItem, setTUI_selectedItem] = useState<{ id: number }>({id: 3});
    const [TUI_selectedFont, setTUI_selectedFont] = useState<string>('');
    const [handler, setHandler] = useState<() => void>();
    const fontSelector = useRef<HTMLSelectElement>();

    const saveImage = () => {
        const image = imageEditor.current.imageEditorInst.toDataURL();
        setProcessingRequest(true);
        LogoService.updateLogoImage(logo_id!, image)
            .then(res => {
                console.log(res);
                setProcessingRequest(false);
            })
            .catch(err => console.log(err));
    }

    const _prepareColorizationTab = (image: string) => {
        const fakeImagePoint = {x: 1, y: 1};
        const fakeGamutPoint = {x: GAMUT_CANVAS_W / 2, y: GAMUT_CANVAS_H / 2};

        let imagePointsToSend: Point[];
        let gamutPointsToSend: Point[];
        if (imagePoints.length === 0) {
            imagePointsToSend = [fakeImagePoint];
            gamutPointsToSend = [fakeGamutPoint];
        } else {
            imagePointsToSend = imagePoints;
            gamutPointsToSend = gamutPoints;
        }

        setOrigImageToColor(image);

        setProcessingRequest(true);
        LogoService.colorize({pointsGamut: gamutPointsToSend, pointsImage: imagePointsToSend}, image)
            .then(res => {
                setCurrentGamut(res.data.gamut);
                // _rerenderGamut(res.data.gamut, gamutPoints[activePoint || 0]);
                setCurrentImage(res.data.result);
                _rerenderColorImage(res.data.result, imagePoints, activePoint);

                // setImagePoints([]);
                // setGamutPoints([]);
                // setActivePoint(null);
                setProcessingRequest(false);
            })
            .catch(err => console.log(err));
    }

    const _processTabChange = (newTab: string, overrideConfirmation: boolean | null = null) => {
        if (processingRequest) return;
        console.log(needConfirmToSwitchTab, showSwitchTabModal);
        if (overrideConfirmation !== false && (needConfirmToSwitchTab || overrideConfirmation === true)) {
            setShowSwitchTabModal(true);
            setNextTab(newTab);
            return;
        }
        setActiveTab(prevTab => {
            let imgDataUrl = '';
            if (prevTab === 'tab1') {
                imgDataUrl = imageEditor.current?.imageEditorInst.toDataURL();
                setCurrentImage(imgDataUrl);
                setOrigImageToColor(imgDataUrl);
            } else if (prevTab === 'tab2') {
                if (imagePoints.length === 0) {
                    imgDataUrl = origImageToColor!;
                } else {
                    imgDataUrl = currentImage!;
                }
            } else if (prevTab === 'tab3') {
                if (textMaskBgCanvasRef.current === null) return prevTab;
                imgDataUrl = textMaskBgCanvasRef.current.toDataURL();
            } else if (prevTab === 'tab4') {
                if (stylerCanvasRef.current === null) return prevTab;
                setStyleImageBackup(null);
                imgDataUrl = stylerCanvasRef.current.toDataURL();
            }

            if (newTab === 'tab1') {
                imageEditor.current?.imageEditorInst.loadImageFromURL(imgDataUrl, 'logo')
                    .then((sizeValue: loadImageResult) => {
                        imageEditor.current?.imageEditorInst.ui.activeMenuEvent();
                        imageEditor.current?.imageEditorInst.ui.resizeEditor({imageSize: sizeValue});
                    });
            } else if (newTab === 'tab2') {
                _prepareColorizationTab(imgDataUrl);
            } else if (newTab === 'tab3') {
                const context = textMaskBgCanvasRef.current?.getContext('2d') as CanvasRenderingContext2D;
                const img = new Image();
                img.onload = () => {
                    context.clearRect(0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                    context.drawImage(img, 0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                }
                img.src = imgDataUrl;
                setTextImageHistory([]);
            } else if (newTab === 'tab4') {
                const context = stylerCanvasRef.current?.getContext('2d') as CanvasRenderingContext2D;
                const img = new Image();
                img.onload = () => {
                    context.clearRect(0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                    context.drawImage(img, 0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                }
                img.src = imgDataUrl;
            }

            return newTab;
        })
    }

    const TUI_updateFontOnText = (inst: ImageEditor, font: string, selected: { id: number }) => {
        console.log("TUI_updateFontOnText", font, selected.id, inst);

        if (font) {
            setTUI_selectedFont(font);
        }

        if (font && selected) {
            console.log('ababa', inst, selected.id, font);
            inst.changeTextStyle(selected.id, {
                fontFamily: font
            })
                .then(() => console.log('updated I have this', selected))
                .catch(() => console.log('I have this', selected));
        }
    }

    const TUI_updateFontSelected = (layer: any) => {
        console.log("TUI_updateFontSelected", layer);

        if (layer.fontFamily) {
            document.querySelector<HTMLInputElement>('.font-selector')!.value = layer.fontFamily;
            setTUI_selectedFont(layer.fontFamily);
        }
    }

    useEffect(() => {
        while (!imageEditor.current) {
            setTimeout(() => {
            }, 100)
        }

        const _processResultData = (data: Logo) => {
            const saveBtn = document.getElementsByClassName('tui-image-editor-load-btn')[0] as HTMLButtonElement;
            console.log(saveBtn);
            saveBtn.addEventListener('click', () => console.log('No save, sorry'));
            setLogo(data);
            setLoaded(true);
            console.log('loaded');

            imageEditor.current?.imageEditorInst.on('objectActivated', (props: { id: number }) => {
                console.log('TUI_selectedItem', props);
                console.log(imageEditor.current?.imageEditorInst);
                setTUI_selectedItem(props);
                TUI_updateFontSelected(props);
            });
        }

        const fetch = () => {
            LogoService.getLogoInfo(logo_id!)
                .then(res => {
                    _processResultData(res.data);

                })
                .catch(err => {
                    console.log(err);
                    if (err.response.status === 404) {
                        setNotFound(true);
                    }
                })
        }

        if (!loaded) {
            if (_DEBUG) {
                _processResultData(mocked_logo);
            } else fetch();
        }

    }, [TUI_selectedItem, imageEditor, loaded, logo_id]);

    useEffect(() => {
        if (!loaded || !logo || !logo.link || !imageCanvasRef.current) return;

        const imageCanvas = imageCanvasRef.current as HTMLCanvasElement;
        const context = imageCanvas.getContext('2d') as CanvasRenderingContext2D;

        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = logo.link;
        image.onload = () => {
            context.drawImage(image, 0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
            const imgDataURL = imageCanvas.toDataURL();
            setCurrentImage(imgDataURL);
            setOrigImageToColor(imgDataURL);

            imageEditor.current?.imageEditorInst.loadImageFromURL(imgDataURL, 'logo')
                .then((sizeValue: loadImageResult) => {
                    imageEditor.current?.imageEditorInst.ui.activeMenuEvent();
                    imageEditor.current?.imageEditorInst.ui.resizeEditor({imageSize: sizeValue});
                });

        };
        console.log('Loaded image from ref');
    }, [imgplaceholderRef.current, imageEditor.current, logo, loaded]);

    useEffect(() => {
        if (imageEditor.current === undefined) {
            return;
        }
        // console.log('Changing event', imageEditor.current?.imageEditorInst);

        const new_handler = () => {
            // console.log('In event', TUI_selectedItem);
            TUI_updateFontOnText(imageEditor.current?.imageEditorInst, document.querySelector<HTMLInputElement>('.font-selector')!.value, TUI_selectedItem)
        }
        const fontSelector = document.querySelector('.font-selector')!;

        if (!fontSelector) {
            return;
        }

        // @ts-ignore
        fontSelector.removeEventListener('change', handler);
        fontSelector.addEventListener('change', new_handler);
        setHandler(new_handler);
    });

    useEffect(() => {
        if (!textMaskCanvasRef.current) return;
        const ctx = textMaskCanvasRef.current?.getContext('2d') as CanvasRenderingContext2D;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
    }, [textMaskCanvasRef.current])

    const _rerenderGamut = (image: string, point: Point | null) => {
        const gamutContext = gamutCanvasRef.current?.getContext('2d') as CanvasRenderingContext2D;

        if (image === '') {
            gamutContext.clearRect(0, 0, GAMUT_CANVAS_W, GAMUT_CANVAS_H);
            return;
        }

        const gamutImg = new Image();

        gamutImg.onload = () => {
            gamutContext.clearRect(0, 0, GAMUT_CANVAS_W, GAMUT_CANVAS_H);
            gamutContext.drawImage(gamutImg, 0, 0, GAMUT_CANVAS_W, GAMUT_CANVAS_H);
            if (point !== null) {
                gamutContext.beginPath();
                gamutContext.roundRect(point.x - POINT_SIZE / 2, point.y - POINT_SIZE / 2, POINT_SIZE, POINT_SIZE, 3);
                gamutContext.stroke();
            }
        };
        gamutImg.src = image;
    }

    const _rerenderColorImage = (image: string, points: Point[], activePointIdx: number | null) => {
        console.log('Rerendering color image with points ', points);
        const context = imageCanvasRef.current?.getContext('2d') as CanvasRenderingContext2D;
        const img = new Image();
        img.onload = () => {
            context.clearRect(0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
            context.drawImage(img, 0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
            points.forEach((point, idx) => {
                context.lineWidth = idx === activePointIdx ? ACTIVE_POINT_LINE_W : POINT_LINE_W;
                context.beginPath();
                context.roundRect(point.x - POINT_SIZE / 2, point.y - POINT_SIZE / 2, POINT_SIZE, POINT_SIZE, 3);
                context.stroke();
            })
        }
        img.src = image;
    }

    const addImagePoint = (x: number, y: number) => {
        if (processingRequest) return;

        let foundPoint: number | null = null;
        for (let i = 0; i < imagePoints.length; ++i) {
            const point = imagePoints[i];
            if (Math.abs(point.x - x) <= ADD_POINT_EPS && Math.abs(point.y - y) <= ADD_POINT_EPS) {
                foundPoint = i;
                break;
            }
        }
        if (foundPoint !== null) return;  // no overlapping points

        const newImagePoint = {x: x, y: y};
        const newGamutPoint = {x: GAMUT_CANVAS_W / 2, y: GAMUT_CANVAS_H / 2};

        const newImagePoints = [...imagePoints, newImagePoint];
        const newGamutPoints = [...gamutPoints, newGamutPoint];
        const newActivePoint = newGamutPoints.length - 1;

        setProcessingRequest(true);
        LogoService.colorize({pointsGamut: newGamutPoints, pointsImage: newImagePoints}, origImageToColor!)
            .then(res => {
                setCurrentGamut(res.data.gamut);
                _rerenderGamut(res.data.gamut, newGamutPoint);
                setCurrentImage(res.data.result);
                _rerenderColorImage(res.data.result, newImagePoints, newActivePoint);

                setImagePoints(newImagePoints);
                setGamutPoints(newGamutPoints);
                setActivePoint(newActivePoint);
                setProcessingRequest(false);
            })
            .catch(err => console.log(err));
    }

    const tryRemoveImagePoint = (x: number, y: number) => {
        if (processingRequest) return;

        let foundPoint: number | null = null;
        for (let i = 0; i < imagePoints.length; ++i) {
            const point = imagePoints[i];
            if (Math.abs(point.x - x) <= REMOVE_POINT_EPS && Math.abs(point.y - y) <= REMOVE_POINT_EPS) {
                foundPoint = i;
                break;
            }
        }

        if (foundPoint === null) return;
        const newGamutPoints = [...gamutPoints];
        newGamutPoints.splice(foundPoint, 1);
        const newImagePoints = [...imagePoints];
        newImagePoints.splice(foundPoint, 1);
        const newActivePoint = newImagePoints.length - 1;

        setProcessingRequest(true);
        if (newActivePoint < 0) {
            const fakeImagePoint = {x: 1, y: 1};
            const fakeGamutPoint = {x: GAMUT_CANVAS_W / 2, y: GAMUT_CANVAS_H / 2};
            const imagePointsToSend = [fakeImagePoint];
            const gamutPointsToSend = [fakeGamutPoint];
            LogoService.colorize({pointsGamut: gamutPointsToSend, pointsImage: imagePointsToSend}, origImageToColor!)
                .then(res => {
                    setCurrentGamut('');
                    _rerenderGamut('', null);
                    setCurrentImage(res.data.result);
                    _rerenderColorImage(res.data.result, newImagePoints, null);

                    setImagePoints(newImagePoints);
                    setGamutPoints(newGamutPoints);
                    setActivePoint(null);
                    setProcessingRequest(false);
                })
                .catch(err => console.log(err));
        } else {
            LogoService.colorize({pointsGamut: newGamutPoints, pointsImage: newImagePoints}, origImageToColor!)
                .then(res => {
                    setCurrentGamut(res.data.gamut);
                    _rerenderGamut(res.data.gamut, newGamutPoints[newActivePoint]);
                    setCurrentImage(res.data.result);
                    _rerenderColorImage(res.data.result, newImagePoints, newActivePoint);

                    setImagePoints(newImagePoints);
                    setGamutPoints(newGamutPoints);
                    setActivePoint(newActivePoint);
                    setProcessingRequest(false);
                })
                .catch(err => console.log(err));
        }
    }

    const changeGamutPoint = (newGamutPoint: Point) => {
        if (processingRequest) return;

        const newGamutPoints = [...gamutPoints];
        newGamutPoints[activePoint!] = newGamutPoint;

        setProcessingRequest(true);
        LogoService.colorize({pointsGamut: newGamutPoints, pointsImage: imagePoints}, origImageToColor!)
            .then(res => {
                const context = imageCanvasRef.current?.getContext('2d') as CanvasRenderingContext2D;
                var img = new Image();
                img.onload = () => context.drawImage(img, 0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                img.src = res.data.result;

                setCurrentGamut(res.data.gamut);
                _rerenderGamut(res.data.gamut, newGamutPoint);

                setCurrentImage(res.data.result);
                _rerenderColorImage(res.data.result, imagePoints, activePoint);

                setGamutPoints(newGamutPoints);
                setProcessingRequest(false);
            })
            .catch(err => console.log(err));
    }

    const _isPixelWhite = (pixelData: Uint8ClampedArray) => {
        return pixelData[0] === 255 && pixelData[1] === 255 && pixelData[2] === 255;
    }

    const detectText = () => {
        if (!textMaskBgCanvasRef.current || !textMaskCanvasRef.current) return;
        setProcessingRequest(true);

        const imageDataURL = textMaskBgCanvasRef.current.toDataURL();

        LogoService.detectText(imageDataURL)
            .then(res => {
                const text_id = res.data.text_id;
                // setProcessingRequest(false);

                const waitForDetection = () => {
                    LogoService.detectTextStatus(text_id)
                        .then(res => {
                            const status = res.data.status;
                            if (status === LogoStatus.in_progress) {
                                setTimeout(waitForDetection, 1000);
                            } else {
                                LogoService.detectTextResult(text_id!)
                                    .then(res => {
                                        const context = textMaskCanvasRef.current?.getContext('2d') as CanvasRenderingContext2D;
                                        const img = new Image();
                                        img.onload = () => {
                                            context.clearRect(0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                                            context.drawImage(img, 0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                                        }
                                        img.src = res.data.mask;
                                        setProcessingRequest(false);
                                        // setCurrentImage(res.data.result);
                                    })
                                    .catch(err => console.log(err))
                            }
                            return;
                        })
                        .catch(err => {
                            console.log(err);
                        });
                }

                waitForDetection();

            })
            .catch(err => console.log(err));

    }

    const eraseText = () => {
        if (!textMaskCanvasRef.current || !textMaskBgCanvasRef.current) return;
        setProcessingRequest(true);

        const imageDataURL = textMaskBgCanvasRef.current.toDataURL();
        const maskDataURL = textMaskCanvasRef.current.toDataURL();

        setTextImageHistory(prevHistory => [...prevHistory, imageDataURL]);

        LogoService.eraseText(imageDataURL, maskDataURL)
            .then(res => {
                const text_id = res.data.text_id;
                // setProcessingRequest(false);

                const waitForErasure = () => {
                    LogoService.eraseTextStatus(text_id)
                        .then(res => {
                            const status = res.data.status;
                            if (status === LogoStatus.in_progress) {
                                setTimeout(waitForErasure, 1000);
                            } else {
                                LogoService.eraseTextResult(text_id!)
                                    .then(res => {
                                        const context = textMaskBgCanvasRef.current?.getContext('2d') as CanvasRenderingContext2D;
                                        const img = new Image();
                                        img.onload = () => {
                                            context.clearRect(0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                                            context.drawImage(img, 0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                                        }
                                        img.src = res.data.result;
                                        setNeedConfirmToSwitchTab(true);
                                        setProcessingRequest(false);
                                        // setCurrentImage(res.data.result);
                                    })
                                    .catch(err => console.log(err))
                            }
                            return;
                        })
                        .catch(err => {
                            console.log(err);
                        });
                }

                waitForErasure();

            })
            .catch(err => console.log(err));
    }

    const restoreTextFromBackup = () => {
        const lastImage = textImageHistory[textImageHistory.length - 1];

        setTextImageHistory(prevHistory => {
            const context = textMaskBgCanvasRef.current?.getContext('2d') as CanvasRenderingContext2D;
            const img = new Image();
            img.onload = () => {
                context.clearRect(0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                context.drawImage(img, 0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
            }
            img.src = lastImage;

            const newHistory = [...prevHistory];
            newHistory.pop();
            return newHistory;
        });
    }

    const restoreStyleFromBackup = () => {
        if (styleImageBackup === null) return;

        const context = stylerCanvasRef.current?.getContext('2d') as CanvasRenderingContext2D;
        const img = new Image();
        img.onload = () => {
            context.clearRect(0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
            context.drawImage(img, 0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
        }
        img.src = styleImageBackup;
        setStyleImageBackup(null);
        setNeedConfirmToSwitchTab(false);
    }

    const stylizeImage = () => {
        if (!stylerCanvasRef.current) return;
        setProcessingRequest(true);

        const imageDataURL = stylerCanvasRef.current.toDataURL();

        if (styleImageBackup === null) {
            setStyleImageBackup(imageDataURL);
            setNeedConfirmToSwitchTab(true);
        }

        LogoService.stylizeImage(imageDataURL, currentStyle)
            .then(res => {
                const img_id = res.data.img_id;

                const waitForStylization = () => {
                    LogoService.stylizeImageStatus(img_id)
                        .then(res => {
                            const status = res.data.status;
                            if (status === LogoStatus.in_progress) {
                                setTimeout(waitForStylization, 1000);
                            } else {
                                LogoService.stylizeImageResult(img_id!)
                                    .then(res => {
                                        const context = stylerCanvasRef.current?.getContext('2d') as CanvasRenderingContext2D;
                                        const img = new Image();
                                        img.onload = () => {
                                            context.clearRect(0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                                            context.drawImage(img, 0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                                        }
                                        img.src = res.data.result;
                                        setNeedConfirmToSwitchTab(true);
                                        setProcessingRequest(false);
                                    })
                                    .catch(err => console.log(err))
                            }
                            return;
                        })
                        .catch(err => {
                            console.log(err);
                        });
                }

                waitForStylization();

            })
            .catch(err => console.log(err));
    }

    const myTheme = {
        ...whiteTheme,
        "menu.backgroundColor": "white",
        "menu.backgroundImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAALCAYAAACprHcmAAABemlDQ1BJQ0MgUHJvZmlsZQAAKM9jYGAqSSwoyGFhYGDIzSspCnJ3UoiIjFJgv8PAzcDDIMRgxSCemFxc4BgQ4MOAE3y7xsAIoi/rgsxK8/x506a1fP4WNq+ZclYlOgz4AXdKanEyAwMjB5CdnFKcnAtk5wDZOskFRSVA9gwgW7e8pADEPgFkixQBHQhk3wGx0yHsDyB2EpjNxAJWExLkDGRLANkCSRC2BoidDmFbgNjJGYkpQLYHyC6IG8CA08NFwdzAUteRgcogN6cUZgcotHhS80KDQe4AYhkGDwYXBgUGcwYDBksGXQbHktSKEpBC5/yCyqLM9IwSBUdgyKYqOOfnFpSWpBbpKHjmJevpKBgZGBqA1IHiDGL05yCw6Yxi5xFi+QsZGCyVGRiYexBiSdMYGLbvYWCQOIUQU5nHwMBvzcCw7VxBYlEi3OGM31gI8YvTjI0gbB4nBgbWe///f1ZjYGCfxMDwd+L//78X/f//dzHQfmCcHcgBACR3aeD10IV6AAAACXBIWXMAAA7EAAAOxAGVKw4bAAABnGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyI+CiAgICAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj4xMTA8L2V4aWY6UGl4ZWxYRGltZW5zaW9uPgogICAgICAgICA8ZXhpZjpQaXhlbFlEaW1lbnNpb24+OTk8L2V4aWY6UGl4ZWxZRGltZW5zaW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KydpWSQAAACVJREFUKFNj/Pnz538GIgFYMRsbG5SLHzBBaaLAqGJkQCvFDAwAlKIH+ycXcc8AAAAASUVORK5CYII=)",
        "common.backgroundColor": "#e7e8e7",
        "downloadButton.backgroundColor": "#015ce3",
        "downloadButton.borderColor": "#015ce3",
        "downloadButton.color": "#fff",
        "menu.normalIcon.path": icond,
        "menu.activeIcon.path": iconb,
        "menu.disabledIcon.path": icona,
        "menu.hoverIcon.path": iconc,
    };

    const locale_ru_RU = {
        'Crop': 'Обзрезать',
        'Delete-all': 'Удалить всё',
        'Load': 'Открыть',
        'Download': 'Скачать',
        'Apply': 'Применить',
        'Cancel': 'Отменить',
        'Flip': 'Отразить',
        'Flip X': 'По X',
        'Flip Y': 'По Y',
        'Reset': 'Сбросить',
        'Rotate': 'Повернуть',
        'Range': 'Угол',
        'Draw': 'Рисовать',
        'Shape': 'Фигура',
        'Text': 'Текст',
        'Filter': 'Фильтр',
    };

    if (notFound) {
        return <NotFound/>;
    }

    return (
        <div>
            <Header backUrl={`/view-logo/${logo_id}`}/>

            {loaded && logo && (
                <img className={'hidden'} ref={imgplaceholderRef} src={logo.link!} crossOrigin='anonymous'/>
            )}

            <div className="tabs">
                <div className={'tabs-nav' + (processingRequest ? ' disabled' : '')}>
                    <div
                        className={activeTab === "tab1" ? "active" : ""}
                        onClick={() => _processTabChange('tab1')}
                    >
                        Редактор
                    </div>
                    <div
                        className={activeTab === "tab2" ? "active" : ""}
                        onClick={() => _processTabChange('tab2')}
                    >
                        Колоризация
                    </div>
                    <div
                        className={activeTab === "tab3" ? "active" : ""}
                        onClick={() => _processTabChange('tab3')}
                    >
                        Удаление текста
                    </div>
                    <div
                        className={activeTab === "tab4" ? "active" : ""}
                        onClick={() => _processTabChange('tab4')}
                    >
                        Стилизация
                    </div>
                </div>
            </div>

            <div className={'loader-with-backdrop' + (processingRequest ? ' visible' : '')}>
                <Triangle
                    height="200"
                    width="200"
                    color='#a3cbff'
                    ariaLabel="triangle-loading"
                    wrapperStyle={{}}
                    // wrapperClassName=""
                    visible={true}
                />
            </div>

            <div className={'editor-wrapper' + (activeTab === 'tab1' ? '' : ' hidden')}>
                <ImageEditor
                    includeUI={{
                        loadImage: {
                            path: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                            name: 'Blank'
                        },
                        theme: myTheme,
                        menu: ["crop", "flip", "rotate", "draw", "shape", "text", "filter"],
                        initMenu: "",
                        locale: locale_ru_RU,
                        uiSize: {
                            height: `calc(100vh - 160px)`,
                        },
                        menuBarPosition: "right",
                    }}
                    cssMaxHeight={window.innerHeight}
                    cssMaxWidth={window.innerWidth}
                    selectionStyle={{
                        cornerSize: 20,
                        rotatingPointOffset: 70,
                    }}
                    usageStatistics={true}
                    ref={imageEditor}
                    onDownload={() => console.log('asdf')}
                />
            </div>

            <div className={'editor-container' + (activeTab === 'tab2' ? '' : ' hidden')}>
                <canvas
                    ref={gamutCanvasRef}
                    className={'colorization-editor-gamut'}
                    width={GAMUT_CANVAS_W}
                    height={GAMUT_CANVAS_H}
                    onClick={(e: React.MouseEvent<HTMLCanvasElement>) => {
                        const rect = gamutCanvasRef.current!.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        if (!gamutCanvasRef.current) return;

                        const ctx = gamutCanvasRef.current.getContext("2d");
                        var pixelData = ctx!.getImageData(x, y, 1, 1).data;
                        if (activePoint !== null && !_isPixelWhite(pixelData)) {
                            changeGamutPoint({x: x, y: y});
                        }
                    }}
                />
                <canvas
                    ref={imageCanvasRef}
                    className={'colorization-editor'}
                    width={COLOR_IMG_CANVAS_W}
                    height={COLOR_IMG_CANVAS_H}
                    onClick={(e: React.MouseEvent<HTMLCanvasElement>) => {
                        const rect = imageCanvasRef.current!.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        if (!imageCanvasRef.current) return;

                        addImagePoint(x, y);
                    }}
                    onContextMenu={(e: React.MouseEvent<HTMLCanvasElement>) => {
                        e.preventDefault();

                        const rect = imageCanvasRef.current!.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        if (!imageCanvasRef.current) return;

                        tryRemoveImagePoint(x, y);
                    }}
                />
            </div>

            <div className={'editor-container' + (activeTab === 'tab3' ? '' : ' hidden')}>
                <div className={'editor-buttons-wrapper'}>
                    <Form>
                        <Form.Range
                            value={textToolWidth}
                            // id={'text-tool-width'}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setTextToolWidth(parseInt(e.target.value))}
                        />
                        <Form.Check
                            checked={showMask}
                            name={'show-text-mask'}
                            type={'checkbox'}
                            id={'text-show-mask'}
                            label={'Показывать маску'}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setShowMask(e.target.checked)}
                        />
                        <Form.Check
                            defaultChecked
                            name={'text-edit-tool'}
                            type={'radio'}
                            id={'text-tool-paint'}
                            label={'Рисовать маску'}
                            disabled={processingRequest}
                            onClick={(_: React.MouseEvent<HTMLInputElement>) => setTextMaskTool(TextMaskTool.paint)}
                        />
                        <Form.Check
                            name={'text-edit-tool'}
                            type={'radio'}
                            id={'text-tool-erase'}
                            label={'Стирать маску'}
                            disabled={processingRequest}
                            onClick={(_: React.MouseEvent<HTMLInputElement>) => setTextMaskTool(TextMaskTool.erase)}
                        />
                    </Form>
                </div>
                <div className={'text-editor-container'}>
                    <canvas
                        ref={textMaskBgCanvasRef}
                        className={'text-editor-mask-bg'}
                        width={COLOR_IMG_CANVAS_W}
                        height={COLOR_IMG_CANVAS_H}
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            zIndex: 0,
                        }}
                    />
                    <canvas
                        ref={textMaskCanvasRef}
                        className={'text-editor-mask' + (!showMask ? ' hidden' : '')}
                        width={COLOR_IMG_CANVAS_W}
                        height={COLOR_IMG_CANVAS_H}
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            zIndex: 2,
                        }}
                        onMouseDown={(e: React.MouseEvent<HTMLCanvasElement>) => {
                            if (processingRequest) return;
                            const rect = textMaskCanvasRef.current!.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            textMaskPos = {x: x, y: y};
                        }}
                        onMouseEnter={(e: React.MouseEvent<HTMLCanvasElement>) => {
                            if (processingRequest) return;
                            const rect = textMaskCanvasRef.current!.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            textMaskPos = {x: x, y: y};
                        }}
                        onMouseMove={(e: React.MouseEvent<HTMLCanvasElement>) => {
                            if (processingRequest) return;
                            if (!textMaskCanvasRef.current) return;
                            const rect = textMaskCanvasRef.current!.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;

                            if (textMaskToolCanvasRef.current) {
                                const toolCtx = textMaskToolCanvasRef.current.getContext('2d') as CanvasRenderingContext2D;
                                toolCtx.lineWidth = 2;
                                toolCtx.strokeStyle = '#fff';
                                toolCtx.clearRect(0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                                toolCtx.beginPath();
                                toolCtx.roundRect(x - textToolWidth / 2, y - textToolWidth / 2, textToolWidth, textToolWidth, textToolWidth);
                                toolCtx.stroke();
                            }

                            if (e.buttons !== 1) return;

                            const ctx = textMaskCanvasRef.current.getContext('2d') as CanvasRenderingContext2D;
                            ctx.beginPath(); // begin

                            ctx.lineWidth = textToolWidth;
                            ctx.lineCap = 'round';
                            console.log(textMaskTool);
                            if (textMaskTool === TextMaskTool.erase) {
                                // ctx.globalCompositeOperation = 'destination-out';
                                ctx.strokeStyle = '#000';
                            } else if (textMaskTool === TextMaskTool.paint) {
                                // ctx.globalCompositeOperation = 'color';
                                ctx.strokeStyle = '#fff';
                            }

                            ctx.moveTo(textMaskPos.x, textMaskPos.y); // from
                            textMaskPos = {x: x, y: y};
                            ctx.lineTo(x, y); // to

                            ctx.stroke(); // draw it!
                        }}
                        onMouseLeave={(e: React.MouseEvent<HTMLCanvasElement>) => {
                            if (!textMaskToolCanvasRef.current) return;
                            const toolCtx = textMaskToolCanvasRef.current.getContext('2d') as CanvasRenderingContext2D;
                            toolCtx.clearRect(0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                        }}
                    />
                    <canvas
                        ref={textMaskToolCanvasRef}
                        className={'text-editor-mask-tool' + (!showMask ? ' hidden' : '')}
                        width={COLOR_IMG_CANVAS_W}
                        height={COLOR_IMG_CANVAS_H}
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            zIndex: 1,
                        }}
                    />
                </div>
                <div className={'editor-buttons-wrapper'}>
                    <Button variant={'primary'} disabled={processingRequest} onClick={() => detectText()}>
                        Распознать текст
                    </Button>
                    <Button variant={'primary'} disabled={processingRequest} onClick={() => eraseText()}>
                        Удалить текст по маске
                    </Button>
                    <Button
                        variant={'primary'}
                        disabled={processingRequest || textImageHistory.length === 0}
                        onClick={() => restoreTextFromBackup()}
                    >
                        Отменить предыдущее удаление
                    </Button>
                </div>
            </div>

            <div className={'editor-container' + (activeTab === 'tab4' ? '' : ' hidden')}>
                {/*<div className={'editor-buttons-wrapper'}>*/}
                {/*    <Form>*/}
                {/*        <Form.Range*/}
                {/*            value={textToolWidth}*/}
                {/*            onChange={(e: ChangeEvent<HTMLInputElement>) => setTextToolWidth(parseInt(e.target.value))}*/}
                {/*        />*/}
                {/*        <Form.Check*/}
                {/*            checked={showMask}*/}
                {/*            name={'show-text-mask'}*/}
                {/*            type={'checkbox'}*/}
                {/*            id={'text-show-mask'}*/}
                {/*            label={'Показывать маску'}*/}
                {/*            onChange={(e: ChangeEvent<HTMLInputElement>) => setShowMask(e.target.checked)}*/}
                {/*        />*/}
                {/*        <Form.Check*/}
                {/*            defaultChecked*/}
                {/*            name={'text-edit-tool'}*/}
                {/*            type={'radio'}*/}
                {/*            id={'text-tool-paint'}*/}
                {/*            label={'Рисовать маску'}*/}
                {/*            disabled={processingRequest}*/}
                {/*            onClick={(_: React.MouseEvent<HTMLInputElement>) => textMaskTool = TextMaskTool.paint}*/}
                {/*        />*/}
                {/*        <Form.Check*/}
                {/*            name={'text-edit-tool'}*/}
                {/*            type={'radio'}*/}
                {/*            id={'text-tool-erase'}*/}
                {/*            label={'Стирать маску'}*/}
                {/*            disabled={processingRequest}*/}
                {/*            onClick={(_: React.MouseEvent<HTMLInputElement>) => textMaskTool = TextMaskTool.erase}*/}
                {/*        />*/}
                {/*    </Form>*/}
                {/*</div>*/}
                <div className={'style-editor-container'}>
                    <canvas
                        ref={stylerCanvasRef}
                        className={'style-editor-canvas'}
                        width={COLOR_IMG_CANVAS_W}
                        height={COLOR_IMG_CANVAS_H}
                    />
                </div>
                <FormGroup className={'form-container styler-options'}>
                    <div className={'options-container'}>
                        {styleOptions.map((option, index) => (
                            <React.Fragment key={index}>
                                <StyleOption
                                    currentStyle={currentStyle}
                                    text={option.text}
                                    value={option.value}
                                    onChange={setCurrentStyle}
                                />
                            </React.Fragment>
                        ))}
                    </div>
                </FormGroup>
                <div className={'editor-buttons-wrapper'}>
                    <Button variant={'primary'} disabled={processingRequest || currentStyle === ''} onClick={() => stylizeImage()}>
                        Стилизовать
                    </Button>
                    <Button
                        variant={'primary'}
                        disabled={processingRequest || styleImageBackup === null}
                        onClick={() => restoreStyleFromBackup()}
                    >
                        Сбросить
                    </Button>
                </div>
            </div>

            <div className={'editor-buttons-wrapper' + (activeTab === 'tab1' ? '' : ' hidden')}>
                {imageEditor.current && imageEditor.current.imageEditorInst.getDrawingMode() === 'TEXT' && (
                    <select className={'form-select font-selector'} onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                        console.log('In event', TUI_selectedItem);
                        console.log('In event', imageEditor.current.imageEditorInst.getDrawingMode());
                        TUI_updateFontOnText(imageEditor.current?.imageEditorInst, e.target.value, TUI_selectedItem);
                        setTUI_selectedFont(e.target.value);
                    }}>
                        {fontArray.map((value, index) => (
                                <option
                                    key={index}
                                    style={{fontFamily: value}}
                                    value={value}
                                    selected={TUI_selectedFont === value}
                                >
                                    {value}
                                </option>
                            )
                        )}
                    </select>)}
                <Button variant={'primary'} onClick={() => saveImage()}>
                    Cохранить
                </Button>
            </div>

            <Modal
                show={showSwitchTabModal}
                backdrop='static'
                keyboard={false}
            >
                <Modal.Header>
                    <Modal.Title>Несохраненные изменения</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p style={{lineHeight: '2em'}}>
                        Изменения, сделанные в этом разделе, нельзя будет отменить, переключившись на другой редактор.
                        Переключить раздел редактора?
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSwitchTabModal(false)}>
                        Остаться
                    </Button>
                    <Button variant="primary" onClick={() => {
                        setNeedConfirmToSwitchTab(false);
                        setShowSwitchTabModal(false);
                        _processTabChange(nextTab, false);
                    }}>
                        Переключиться
                    </Button>
                </Modal.Footer>
            </Modal>

        </div>
    )
}

export default LogoEditorPage;
