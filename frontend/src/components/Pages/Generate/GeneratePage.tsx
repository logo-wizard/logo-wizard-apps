import React, {useState} from "react";
import Button from "react-bootstrap/Button";

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
    const [activeLogo, setActiveLogo] = useState<LogoDraft>({
        title: "",
        is_public: true,
        objects: [],
        palette: "",
        specialization: [],
        style: "",
        status: LogoStatus.in_progress
    });

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
        setActiveLogo(item);
        setModal(!modal);
    }

    return (
        <main className="content">
            <Header/>
            <div>
                <div className="col-md-10 col-sm-10 mx-auto p-0">
                    <div className={'d-flex justify-content-center m-5'}>
                        <Button
                            onClick={createItem}
                            variant={'primary'}
                            size={'lg'}
                        >
                            <span>Создать логотип</span>
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
                    activeItem={activeLogo}
                    toggle={toggle}
                    onSave={handleSubmit}
                />
            ) : null}
        </main>
    );
};


export default GeneratePage;
