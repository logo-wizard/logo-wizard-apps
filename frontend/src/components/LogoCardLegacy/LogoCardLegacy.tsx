import React, {FC} from "react";

import './style.css';


interface LogoCardProps {
    link: string,
    img: string,
    text: string,
}


const LogoCard: FC<LogoCardProps> = ({link, img, text}) => {
    return (
        <a href={link} className="logocard-as-link">
            <div className="logocard">
                <div className="logocard-header">
                    <img src={img} alt="rover"/>
                </div>
                <div className="logocard-body">
                    <div className="logocard-title">
                        {text}
                    </div>
                    {/*<div class="link_wrapper"> <a href="" class="card_link">Перейти</a></div>*/}
                </div>
            </div>
        </a>
    )
}


interface LogoCardCollectionProps {
    children: React.ReactElement<LogoCardProps> | Array<React.ReactElement<LogoCardProps>>;
}


const LogoCardCollection: FC<LogoCardCollectionProps> = ({children}) => {
    return (
        <div className={"logocard-container"}>
            {children}
        </div>
    )
}
