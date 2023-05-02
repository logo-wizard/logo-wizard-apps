import {FC} from "react";

import './style.css';


interface ArrowBackProps {
    backUrl?: string
}


const ArrowBack: FC<ArrowBackProps> = ({backUrl}) => {
    // Renders an animated left arrow which can be a link; the arrow itself is defined with css

    if (backUrl) {
        return (
            <a href={backUrl} className={'arrow'}> </a>
        )
    } else {
        return null;
    }
}

export default ArrowBack;
