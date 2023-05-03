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
import {whiteTheme} from "./editor-theme";
import {FormGroup} from "react-bootstrap";
import {StyleOption} from "../../Form/FormSteps/StyleStep";
import {NotFound} from "../NotFoundPage/NotFoundPage";
import {Forbidden} from "../ForbiddenPage/ForbiddenPage";
import UserService from "../../../services/UserService";
import TriangleLoader from "../../Loader/Loader";

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
    "Noto Sans",
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
const ACTIVE_POINT_LINE_W = 5;


const styleOptions: { text: string, value: string }[] = [
    {text: 'Пастельные тона', value: 'pastel colors style'},
    {text: 'Трехмерный', value: '3d modern style'},
    {text: 'Неон', value: 'light neon, minimalistic soft style'},
    {text: 'Bright Art', value: 'Salvador Dali style'},
    {text: 'Soft Art', value: 'Claude Monet style'},
    {text: 'Яркие цвета', value: 'aesthetic art style'},
    {text: 'Эмблема', value: 'emblem badge style'},
    {text: 'Винтажный', value: 'vintage old style'},
    {text: 'Аниме', value: 'anime masterpiece by Studio Ghibli, 8k, sharp high quality anime, artstation'},
    {text: 'Мультфильм', value: 'objects in style of digital art, smooth, sharp focus, gravity falls style, doraemon style, shinchan style, anime style'},
    {text: 'Витраж', value: 'stained glass illustration, 4k, hyper detailed, cinematic, vivid colors'},
    {text: 'Случайный', value: 'logo style'},
]


const LogoEditorPage = () => {
    const [searchParams, _] = useSearchParams();
    let _DEBUG = false;
    let _DEBUG_FONTS = false;
    if (searchParams.get('_debug') === '1') {
        _DEBUG = true;
    }
    if (searchParams.get('_debug_fonts') === '1') {
        _DEBUG_FONTS = true;
    }

    const {logo_id} = useParams();
    const [logo, setLogo] = useState<Logo>();
    const [loaded, setLoaded] = useState<boolean>(false);
    const [notFound, setNotFound] = useState<boolean>(false);
    const [forbidden, setForbidden] = useState<boolean>(false);
    const imgplaceholderRef = useRef<HTMLImageElement | null>(null);
    const [processingRequest, setProcessingRequest] = useState<boolean>(false);  // if there is a request in progress
    const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

    // tabs
    const [showSwitchTabModal, setShowSwitchTabModal] = useState<boolean>(false);
    const [needConfirmToSwitchTab, setNeedConfirmToSwitchTab] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState("base-editor-tab");
    const [nextTab, setNextTab] = useState<string>('');

    // basic editor
    const imageEditor = useRef<ImageEditor>();

    const [TUI_selectedItem, setTUI_selectedItem] = useState<{ id: number }>({id: 3});
    const [TUI_selectedFont, setTUI_selectedFont] = useState<string>(fontArray[0]);
    const [handler, setHandler] = useState<() => void>();
    const fontSelector = useRef<HTMLSelectElement>();

    // colorization
    const [currentImage, setCurrentImage] = useState<string>();
    const [origImageToColor, setOrigImageToColor] = useState<string>();
    const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const gamutCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [currentGamut, setCurrentGamut] = useState<string | null>(null);
    const [gamutPoints, setGamutPoints] = useState<Point[]>([]);
    const [imagePoints, setImagePoints] = useState<Point[]>([]);
    const [activePoint, setActivePoint] = useState<number | null>(null);

    // text detection & removal
    const textMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const textMaskBgCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const textMaskToolCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [showMask, setShowMask] = useState<boolean>(true);
    const [textImageHistory, setTextImageHistory] = useState<string[]>([]);
    const [textToolWidth, setTextToolWidth] = useState<number>(25);
    const [textMaskTool, setTextMaskTool] = useState<TextMaskTool>(TextMaskTool.paint);
    let textMaskPos: Point = {x: 0, y: 0};

    // stylization
    const stylerCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [currentStyle, setCurrentStyle] = useState<string>('');
    const [styleImageBackup, setStyleImageBackup] = useState<string | null>(null);

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
        // Requests colorization with default params and loads the result into the image canvas

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
        // Handles switching between the tabs
        // Loads and saves images to keep them relevant when switching tabs

        if (processingRequest || newTab === activeTab) return;
        if (overrideConfirmation !== false && (needConfirmToSwitchTab || overrideConfirmation === true)) {
            setShowSwitchTabModal(true);
            setNextTab(newTab);
            return;
        }
        setActiveTab(prevTab => {
            let imgDataUrl = '';
            if (prevTab === 'base-editor-tab') {
                imgDataUrl = imageEditor.current?.imageEditorInst.toDataURL();
                setCurrentImage(imgDataUrl);
                setOrigImageToColor(imgDataUrl);
            } else if (prevTab === 'color-tab') {
                if (imagePoints.length === 0) {
                    imgDataUrl = origImageToColor!;
                } else {
                    imgDataUrl = currentImage!;
                }
            } else if (prevTab === 'text-tab') {
                if (textMaskBgCanvasRef.current === null) return prevTab;
                imgDataUrl = textMaskBgCanvasRef.current.toDataURL();
            } else if (prevTab === 'style-tab') {
                if (stylerCanvasRef.current === null) return prevTab;
                setStyleImageBackup(null);
                imgDataUrl = stylerCanvasRef.current.toDataURL();
            }

            if (newTab === 'base-editor-tab') {
                imageEditor.current?.imageEditorInst.loadImageFromURL(imgDataUrl, 'logo')
                    .then((sizeValue: loadImageResult) => {
                        imageEditor.current?.imageEditorInst.ui.activeMenuEvent();
                        imageEditor.current?.imageEditorInst.ui.resizeEditor({imageSize: sizeValue});
                    });
            } else if (newTab === 'color-tab') {
                _prepareColorizationTab(imgDataUrl);
            } else if (newTab === 'text-tab') {
                const context = textMaskBgCanvasRef.current?.getContext('2d') as CanvasRenderingContext2D;
                const img = new Image();
                img.onload = () => {
                    context.clearRect(0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                    context.drawImage(img, 0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
                }
                img.src = imgDataUrl;
                setTextImageHistory([]);
            } else if (newTab === 'style-tab') {
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

    const changeFont = (fontFamily: string) => {
        console.log(fontFamily);
        setTUI_selectedFont(fontFamily);
        if (TUI_selectedItem) {
            imageEditor.current.imageEditorInst.changeTextStyle(
                TUI_selectedItem.id,
                { fontFamily: fontFamily },
            )
        }
    }

    useEffect(() => {
        // The main useEffect that is triggered on load
        // Loads the logo, sets up the editor

        while (!imageEditor.current) {
            setTimeout(() => {
            }, 100)
        }

        const _processResultData = (data: Logo) => {
            const loadBtn = document.getElementsByClassName('tui-image-editor-load-btn')[0] as HTMLButtonElement;
            loadBtn.addEventListener('click', () => console.log('No loading, sorry'));
            setLogo(data);
            setLoaded(true);

            imageEditor.current?.imageEditorInst.on('objectActivated', (props: { id: number, fontFamily: string }) => {
                console.log('TUI_selectedItem', props);
                setTUI_selectedFont(props.fontFamily)
                setTUI_selectedItem({id: props.id});
            });
        }

        const fetch = () => {
            LogoService.getLogoInfo(logo_id!)
                .then(res => {
                    if (!UserService.isLoggedIn() || res.data.created_by !== UserService.getUserId()) {
                        setForbidden(true);
                        return
                    }
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

    }, [imageEditor, loaded, logo_id]);

    useEffect(() => {
        // Another important useEffect that loads the image itself on load

        if (!loaded || !logo || !logo.link || !imageCanvasRef.current) return;

        const imageCanvas = imageCanvasRef.current as HTMLCanvasElement;
        const context = imageCanvas.getContext('2d') as CanvasRenderingContext2D;

        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = logo.link.replace('host.docker.internal', 'localhost');
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
        // Fills the mask canvas with black color on load == mask is empty

        if (!textMaskCanvasRef.current) return;
        const ctx = textMaskCanvasRef.current?.getContext('2d') as CanvasRenderingContext2D;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
    }, [textMaskCanvasRef.current])

    const _rerenderGamut = (image: string, point: Point | null) => {
        // Re-renders the gamut canvas with the passed image and point

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
        // Re-renders the main colorization canvas with the passed image, points and the active point id

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
        // Adds an image point for colorization, adds default gamut point and processes the colorization

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
        // Removes a point with the passed coordinates

        if (processingRequest) return false;

        let foundPoint: number | null = null;
        for (let i = 0; i < imagePoints.length; ++i) {
            const point = imagePoints[i];
            if (Math.abs(point.x - x) <= REMOVE_POINT_EPS && Math.abs(point.y - y) <= REMOVE_POINT_EPS) {
                foundPoint = i;
                break;
            }
        }

        if (foundPoint === null) return false;
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

        return true
    }

    const changeGamutPoint = (newGamutPoint: Point) => {
        // Processes gamut point change

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
        // Processes text detection: sends image, receives and renders the result

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
        // Processes text removal: sends image and mask, receives and renders the result

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
        // Pops the latest image from text erasure history and renders it, saves the original image into the history

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
        // Restores the original image before stylization

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
        // Processes stylization: sends the image and the style prompt, receives and renders the result

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
        "downloadButton.backgroundColor": "var(--bs-primary)",
        "downloadButton.borderColor": "var(--bs-primary)",
        "downloadButton.color": "#000",
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

    if (forbidden) {
        return <Forbidden/>
    }

    function getMousePosition(e: React.MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        return {x: mouseX, y: mouseY};
    }

    function getTouchPosition(e: React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.touches[0].clientX - rect.left;
        const mouseY = e.touches[0].clientY - rect.top;
        return {x: mouseX, y: mouseY};
    }

    const textMaskDrawStart = (p: Point) => {
        if (processingRequest) return;
        textMaskPos = {x: p.x, y: p.y};
    }

    const textMaskDrawMove = (p: Point, allowDrawing: boolean) => {
        if (processingRequest) return;
        if (!textMaskCanvasRef.current) return;

        if (textMaskToolCanvasRef.current) {
            const toolCtx = textMaskToolCanvasRef.current.getContext('2d') as CanvasRenderingContext2D;
            toolCtx.lineWidth = 2;
            toolCtx.strokeStyle = '#fff';
            toolCtx.clearRect(0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
            toolCtx.beginPath();
            toolCtx.roundRect(p.x - textToolWidth / 2, p.y - textToolWidth / 2, textToolWidth, textToolWidth, textToolWidth);
            toolCtx.stroke();
        }

        if (!allowDrawing) return;

        const ctx = textMaskCanvasRef.current.getContext('2d') as CanvasRenderingContext2D;
        ctx.beginPath(); // begin

        ctx.lineWidth = textToolWidth;
        ctx.lineCap = 'round';
        if (textMaskTool === TextMaskTool.erase) {
            // ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = '#000';
        } else if (textMaskTool === TextMaskTool.paint) {
            // ctx.globalCompositeOperation = 'color';
            ctx.strokeStyle = '#fff';
        }

        ctx.moveTo(textMaskPos.x, textMaskPos.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        textMaskPos = {x: p.x, y: p.y};
    }

    const textMaskDrawEnd = (_: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!textMaskToolCanvasRef.current) return;
        const toolCtx = textMaskToolCanvasRef.current.getContext('2d') as CanvasRenderingContext2D;
        toolCtx.clearRect(0, 0, COLOR_IMG_CANVAS_W, COLOR_IMG_CANVAS_H);
    }

    return (
        <div>
            <Header backUrl={`/view-logo/${logo_id}`}/>

            {/* this below is a dirty (?) hack to track selected item state */}
            <h1 style={{display: 'none'}}>{TUI_selectedItem.id}</h1>
            {_DEBUG_FONTS && fontArray.map((value, index) => (
                <h1 key={index} style={{fontFamily: value}}>{value}</h1>
            ))}

            {loaded && logo && (
                <img
                    className={'hidden'}
                    ref={imgplaceholderRef}
                    src={logo.link!}
                    crossOrigin='anonymous'
                    onError={({currentTarget}) => {
                        const local_s3_link = currentTarget.src.replace('host.docker.internal', 'localhost');
                        if (currentTarget.src !== local_s3_link) currentTarget.src = local_s3_link;
                    }}
                />
            )}

            <div className="tabs">
                <div className={'tabs-nav' + (processingRequest ? ' disabled' : '')}>
                    <div
                        className={activeTab === "base-editor-tab" ? "active" : ""}
                        onClick={() => _processTabChange('base-editor-tab')}
                    >
                        Редактор
                    </div>
                    <div
                        className={activeTab === "color-tab" ? "active" : ""}
                        onClick={() => _processTabChange('color-tab')}
                    >
                        Колоризация
                    </div>
                    <div
                        className={activeTab === "text-tab" ? "active" : ""}
                        onClick={() => _processTabChange('text-tab')}
                    >
                        Удаление текста
                    </div>
                    <div
                        className={activeTab === "style-tab" ? "active" : ""}
                        onClick={() => _processTabChange('style-tab')}
                    >
                        Стилизация
                    </div>
                </div>
            </div>

            <div className={'loader-with-backdrop' + (processingRequest ? ' visible' : '')}>
                <TriangleLoader width={200} height={200}/>
            </div>

            <div className={'editor-buttons-wrapper' + (activeTab === 'base-editor-tab' ? '' : ' hidden')}>
                <Button variant={'outline-primary'} onClick={() => setShowHelpModal(true)}>
                    Справка
                </Button>
            </div>

            <div className={'editor-wrapper' + (activeTab === 'base-editor-tab' ? '' : ' hidden')}>
                <ImageEditor
                    includeUI={{
                        loadImage: {
                            path: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                            name: 'Blank'
                        },
                        theme: myTheme,
                        menu: [
                            // 'crop',  // it is too painful to crop only squares, but we do not support non-square images
                            'flip',
                            // 'rotate',  // there is no point in rotation if you can't crop
                            'draw',
                            'shape',
                            'text',
                            'filter',
                        ],
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
                    usageStatistics={false}
                    ref={imageEditor}
                    onDownload={() => console.log('No.')}
                />
            </div>

            <div className={'editor-container' + (activeTab === 'color-tab' ? '' : ' hidden')}>
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

                        const isPoint = tryRemoveImagePoint(x, y);
                        if (!isPoint) {
                            addImagePoint(x, y);
                        }
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

            <div className={'editor-container' + (activeTab === 'text-tab' ? '' : ' hidden')}>
                <div className={'editor-buttons-wrapper mg-top-0'}>
                    <Form>
                        <Form.Range
                            value={textToolWidth}
                            id={'text-tool-width'}
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
                            textMaskDrawStart(getMousePosition(e, textMaskCanvasRef.current!));
                        }}
                        onMouseEnter={(e: React.MouseEvent<HTMLCanvasElement>) => {
                            textMaskDrawStart(getMousePosition(e, textMaskCanvasRef.current!));
                        }}
                        onMouseMove={(e: React.MouseEvent<HTMLCanvasElement>) => {
                            textMaskDrawMove(getMousePosition(e, textMaskCanvasRef.current!), e.buttons === 1);
                        }}
                        onMouseLeave={(e: React.MouseEvent<HTMLCanvasElement>) => {
                            textMaskDrawEnd(e);
                        }}
                        onTouchStart={(e: React.TouchEvent<HTMLCanvasElement>) => {
                            textMaskDrawStart(getTouchPosition(e, textMaskCanvasRef.current!));
                        }}
                        onTouchMove={(e: React.TouchEvent<HTMLCanvasElement>) => {
                            textMaskDrawMove(getTouchPosition(e, textMaskCanvasRef.current!), true);
                        }}
                        onTouchEnd={(e: React.TouchEvent<HTMLCanvasElement>) => {
                            textMaskDrawEnd(e);
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
                <div className={'editor-buttons-wrapper mg-bot-30'}>
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

            <div className={'editor-container' + (activeTab === 'style-tab' ? '' : ' hidden')}>
                <div className={'style-editor-container'}>
                    <canvas
                        ref={stylerCanvasRef}
                        className={'style-editor-canvas'}
                        width={COLOR_IMG_CANVAS_W}
                        height={COLOR_IMG_CANVAS_H}
                    />
                </div>
                <FormGroup className={'form-container styler-options mg-top-10'}>
                    <div className={'editor-styler-options-container'}>
                        {styleOptions.map((option, index) => (
                            <StyleOption
                                key={index}
                                currentStyle={currentStyle}
                                text={option.text}
                                value={option.value}
                                onChange={setCurrentStyle}
                                disabled={processingRequest}
                            />
                        ))}
                    </div>
                </FormGroup>
                <div className={'editor-buttons-wrapper mg-bot-30 mg-top-10'}>
                    <Button variant={'primary'} disabled={processingRequest || currentStyle === ''}
                            onClick={() => stylizeImage()}>
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

            <div className={'editor-buttons-wrapper mg-bot-30' + (activeTab === 'base-editor-tab' ? '' : ' hidden')}>
                <Form.Select
                    className={'form-select font-selector'}
                    value={TUI_selectedFont}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => changeFont(e.target.value)}
                >
                    {fontArray.map((value, index) => (
                        <option
                            key={index}
                            style={{fontFamily: value}}
                            value={value}
                        >
                            {value}
                        </option>
                    ))}
                </Form.Select>
                <Button variant={'primary'} onClick={() => saveImage()}>
                    Cохранить
                </Button>
            </div>

            {/* Help modal */}
            <Modal
                show={showHelpModal}
                onHide={() => setShowHelpModal(false)}
                keyboard={true}
                className={'help-modal'}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Редактор</Modal.Title>
                </Modal.Header>
                <Modal.Body className={'help-modal-text'}>
                    <p className={'heading'}>
                        Добро пожаловать в редактор.
                    </p>
                    <p>
                        В нем доступны четыре вкладки:
                    </p>
                    <ul>
                        <li>Стандартный редактор</li>
                        <li>Колоризация</li>
                        <li>Удаление текста</li>
                        <li>Стилизация</li>
                    </ul>
                    <p>
                        При работе с редактором важно помнить, что результаты, полученные при работе на одной вкладке, при переходе на другую становятся <b>необратимыми</b>. То есть, если окрасить изображение и перейти на вкладку стилизации, работа продолжится с изображением в новых цветах и вернуть обратно прежние цвета будет нельзя.
                    </p>
                    <p>
                        Сохранение изображения доступно на вкладке основного редактора.
                    </p>

                    <p className={'heading'}>
                        Колоризация
                    </p>
                    <p>
                        Левой кнопкой мыши или нажатием на изображение добавляйте новые точки для колоризации.
                    </p>
                    <p>
                        Нажатием на цветную область цветовой палитры назначайте ей цвет.
                    </p>
                    <p>
                        <span className={'important'}>Важно!</span> Колоризация производится с учетом яркости изображения, поэтому для любой точки можно выбрать цвет только из ограниченного спектра, например, темные участки изображения не получится покрасить в яркий цвет.
                    </p>
                    <p>
                        Активная точка отображается жирнее остальных.
                    </p>
                    <p>
                        Удаляйте точки повторным нажатием.
                    </p>
                    <p>
                       <span className={'important'}>Важно!</span> Удаление всех точек с изображения возвращает его к состоянию, в котором оно было при переходе на вкладку колоризации.
                    </p>

                    <p className={'heading'}>
                        Удаление текста
                    </p>
                    <p>
                        Распознавайте текст нажатием кнопки.
                    </p>
                    <p>
                        Корректируйте маску вручную – чем меньше пространства останется в пределах маски вокруг текста, тем лучше будет результат.
                    </p>
                    <p>
                        Удаляйте текст по маске нажатием кнопки и отменяйте удаление в случае неудачи. Порой несколько применений одной и той же маски подряд приводят к более хорошему результату.
                    </p>

                    <p className={'heading'}>
                        Стилизация
                    </p>
                    <p>
                        Выбирайте один из доступных стилей и применяйте его нажатием кнопки.
                    </p>
                    <p>
                        <span className={'important'}>Важно!</span> Стиль применяется к текущему изображению на экране, то есть несколько стилей подряд будут применяться по цепочке. При необходимости сбрасывайте стиль кнопкой, но помните, что при переходе на другую вкладку прежний вид уже не вернуть.
                    </p>

                    <p className={'heading'}>
                        Начинайте творить!
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={() => setShowHelpModal(false)}>
                        Поехали
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Unsaved changes modal */}
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
