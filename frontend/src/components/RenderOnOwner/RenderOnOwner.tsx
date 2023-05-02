import {FC, ReactNode} from "react";

import UserService from "../../services/UserService";


interface Props {
    user_id?: string | null
    children: ReactNode
}


const RenderOnOwner: FC<Props> = (props) => {
    // A helper component that renders passed components only if the user_id is equal to the passed one

    return (UserService.getUserId() === props.user_id) ? (
        <>{props.children}</>
    ) : null
};


export default RenderOnOwner;
