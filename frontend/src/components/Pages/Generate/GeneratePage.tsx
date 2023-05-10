import React, {useEffect, useState} from "react";
import Button from "react-bootstrap/Button";

import {Logo, LogoDraft, LogoStatus} from "../../../types/types";
import LogoService from "../../../services/LogoService"
import {is_dev} from "../../../utils";
import {mockLogoList} from "../../../utils/mocks";
import Header from "../../Header/Header";
import LogoCreateModal from "../../LogoCreateModal/LogoCreateModal";
import {LogoCardsCollection} from "../../LogoCard/LogoCard";
import UserService from "../../../services/UserService";
import TriangleLoader from "../../Loader/Loader";


const GeneratePage = () => {
    const LATEST_LOGOS_KEY = '__latest_logos__';
    const LATEST_LOGOS_N = 5;

    const [logoIdsList, setLogoIdsList] = useState<string[] | null>(null);
    const [logoList, setLogoList] = useState<Logo[] | undefined>(is_dev() ? mockLogoList : undefined);

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

    useEffect(() => {
        console.log('what');
        const latestLogoIdsListStr = localStorage.getItem(LATEST_LOGOS_KEY);
        if (latestLogoIdsListStr === null) {
            setLogoIdsList([]);
            setLogoList([]);
            return;
        }
        const latestLogoIdsList: string[] = JSON.parse(latestLogoIdsListStr);
        setLogoIdsList(latestLogoIdsList);

        LogoService.getBatchLogos({
            logos: latestLogoIdsList.map(id => {
                return {logo_id: id}
            })
        })
            .then(res => setLogoList(res.data))
            .catch(err => console.log(err));
    }, [])

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
                    setLogoList(prevState => {
                        const newLogoList = [newLogo, ...(prevState || [])];
                        console.log(newLogoList);
                        const newLatestLogos = newLogoList
                            .filter(logo => logo.created_by === null || (UserService.isLoggedIn() && logo.created_by === UserService.getUserId()))
                            .slice(0, LATEST_LOGOS_N)
                            .map(logo => logo.id);
                        localStorage.setItem(LATEST_LOGOS_KEY, JSON.stringify(newLatestLogos));
                        return newLogoList;
                    });
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

                    {logoIdsList === null ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            verticalAlign: 'middle',
                            width: '100%',
                            height: '100%',
                            margin: 'auto',
                        }}>
                            <TriangleLoader width={100} height={100}/>
                        </div>
                    ) : logoIdsList.length === 0 && logoList?.length === 0 ? (
                        <div className={'no-logos-area-wrapper'}>
                            <h2 style={{textAlign: 'center'}}>
                                Похоже, здесь пока нет ни одного логотипа
                            </h2>
                        </div>
                    ) : (
                        <LogoCardsCollection
                            amount={logoIdsList.length}
                            loaded={logoList !== null}
                            logos={logoList}
                            withRegen={true}
                        />
                    )}
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
