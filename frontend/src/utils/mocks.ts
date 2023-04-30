import {Logo, LogoStatus} from "../types/types";


export const mockLogoList: Logo[] = [
    {
        id: 'logo_id_001',
        created_by: null,
        is_public: true,
        title: 'Loooong looooong loooong prompt',
        status: LogoStatus.in_progress
    },
    {
        id: 'logo_id_002',
        created_by: '9cdd727a-58d0-4508-85f1-bae9ea7ef82d',
        title: 'Christmas tree',
        is_public: true,
        status: LogoStatus.ready,
        link: 'https://storage.yandexcloud.net/s3-logo/test_upload.png'
    },
    {
        id: 'logo_id_003',
        created_by: '9cdd727a-58d0-4508-85f1-bae9ea7ef82d',
        title: 'Failed',
        is_public: false,
        status: LogoStatus.failed
    },
];
