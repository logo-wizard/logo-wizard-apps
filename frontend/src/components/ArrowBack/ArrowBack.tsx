import {FC} from "react";

import './style.css';


interface ArrowBackProps {
    backUrl?: string
}


const ArrowBack: FC<ArrowBackProps> = ({backUrl}) => {
    if (backUrl) {
        return (
            <a href={backUrl} className={'arrow'}> </a>
        )
    } else {
        return null;
    }
}

export default ArrowBack;
