import React, {useState} from "react";
import Button from "react-bootstrap/Button";
import {Triangle} from "react-loader-spinner";

import {Logo, LogoDraft, LogoStatus} from "../../../types/types";
import LogoService from "../../../services/LogoService"
import {is_dev} from "../../../utils";
import {mockLogoList} from "../../../utils/mocks";
import Header from "../../Header/Header";
import LogoCreateModal from "../../LogoCreateModal/LogoCreateModal";
import {LogoCardsCollection} from "../../LogoCard/LogoCard";
import UserService from "../../../services/UserService";


const GeneratePage = () => {
    const [logoList, setLogoList] = useState<Logo[]>(is_dev() ? mockLogoList : []);
    const [modal, setModal] = useState<boolean>(false);
    const [polling, setPolling] = useState<boolean>(false);
    const [activeItem, setActiveItem] = useState<LogoDraft>({
        title: "",
        is_public: true,
        objects: [],
        palette: "",
        specialization: [],
        style: "",
        status: LogoStatus.in_progress
    });

    function fetchLogos() {
        // const currentLogoList = [...logoList];
        //
        // let anyPending = false;
        //
        // for (let i = 0; i < currentLogoList.length; ++i) {
        //     let logo = currentLogoList[i];
        //
        //     if (logo.status !== LogoStatus.in_progress)
        //         continue;
        //
        //     anyPending = true;
        //     LogoService.getLogoInfo(logo.id)
        //         .then(res => {
        //             logo.title = res.data.title;
        //             logo.status = res.data.status;
        //             logo.link = res.data.link;
        //         })
        //         .catch(err => console.log(err))
        //
        // }
        //
        // setLogoList(currentLogoList);
        //
        // if (anyPending && !polling) {
        //     setPolling(true);
        //     setTimeout(() => fetchLogos(), 1000);
        // } else {
        //     setPolling(false);
        // }
    }

    function toggle() {
        setModal(!modal);
    }

    function handleSubmit(item: LogoDraft, nLogosToCreate: number) {
        if (item.title.trim() === '') {
            item.title = 'Без названия';
        }
        toggle();

        for (let i = 0; i < nLogosToCreate; ++i) {
            LogoService.requestGeneration(item)
                .then(res => {
                    const newLogo: Logo = {
                        id: '',
                        is_public: item.is_public,
                        created_by: UserService.isLoggedIn() ? UserService.getUserId()! : null,
                        title: item.title,
                        status: LogoStatus.in_progress
                    };
                    newLogo.id = res.data.logo_id;
                    setLogoList(prevLogoList => [newLogo, ...prevLogoList]);
                    // fetchLogos();
                });
        }
    }

    function createItem() {
        const item: LogoDraft = {
            title: '',
            is_public: true,
            objects: [],
            palette: '',
            specialization: [],
            style: '',
            status: LogoStatus.in_progress
        };
        setActiveItem(item);
        setModal(!modal);
    }

    return (
        <main className="content">
            <Header/>
            {/*<h1 className="text-center my-4">Генератор Логотипов</h1>*/}
            <div>
                <div className="col-md-10 col-sm-10 mx-auto p-0">
                    <div className={'d-flex justify-content-center m-5'}>
                        <Button
                            onClick={createItem}
                            disabled={polling}
                            variant={'primary'}
                            size={'lg'}
                            className={`ld-ext-right ${polling ? 'running' : ''}`}
                        >
                            {polling ? (
                                    <span>Создаем логотип&nbsp;&nbsp;<div className={'ld ld-ring ld-spin btn-ld-override'} style={{verticalAlign: 'middle', display: 'inline-block', margin: 'auto'}}></div></span>
                                ) : (
                                    <span>Создать логотип</span>
                                )
                            }
                        </Button>
                    </div>

                    <LogoCardsCollection
                        amount={logoList.length}
                        loaded={logoList.length > 0}
                        logos={logoList}
                        withRegen={true}
                    />
                </div>
            </div>
            {modal ? (
                <LogoCreateModal
                    activeItem={activeItem}
                    toggle={toggle}
                    onSave={handleSubmit}
                />
            ) : null}
        </main>
    );
};


export default GeneratePage;
