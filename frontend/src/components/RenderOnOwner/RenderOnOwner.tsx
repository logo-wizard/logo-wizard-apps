import {FC, ReactNode} from "react";

import UserService from "../../services/UserService";


interface Props {
    user_id?: string | null
    children: ReactNode
}


const RenderOnOwner: FC<Props> = (props) => {
    return (UserService.getUserId() === props.user_id) ? (
        <>{props.children}</>
    ) : null
};


export default RenderOnOwner;
