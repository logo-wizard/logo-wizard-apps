import {FC, ReactNode} from "react";

import UserService from "../../services/UserService";


interface Props {
    children: ReactNode
}


const RenderOnAuthenticated: FC<Props> = (props) => {
    return (UserService.isLoggedIn()) ? (
        <>{props.children}</>
    ) : null
};


export default RenderOnAuthenticated;
