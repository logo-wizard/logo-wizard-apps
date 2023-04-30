import {FC} from "react";
import md5 from "js-md5";

import {getColorAndBackground, getInitials} from "./utils";


interface UserData {
    username?: string
    email?: string
}


interface GravatarProps extends UserData {
    size?: number
    border?: string
}


const Gravatar: FC<GravatarProps> = (
    {
        username,
        email,
        size = 50,
        border,
    }
) => {
    let url: string;
    let emailMd5: string;

    if (email === undefined) {
        emailMd5 = 'ihmaiwtd';
        url = `https://www.gravatar.com/avatar/?s=${String(
            Math.max(size, 480),
        )}&d=mp`;
    } else {
        emailMd5 = md5(email);
        url = `https://www.gravatar.com/avatar/${emailMd5}?s=${String(
            Math.max(size, 480),
        )}&d=blank`;
    }

    const initials = (username !== undefined ? getInitials(username) : '');

    // const c = useStyles({emailMd5, size, initials})

    return (
        <div style={{
            ...getColorAndBackground(emailMd5),
            position: 'relative',
            width: size,
            height: size,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.15)',
        }}>
            <div aria-hidden='true' style={{
                // @ts-ignore
                fontSize: size / (1.4 * Math.max([...initials].length, 2)),
                position: 'absolute',
                fontFamily: 'sans-serif',
                userSelect: 'none',
            }}>
                {initials}
            </div>
            <img src={String(url)} alt={`${username}’s avatar`} style={{
                position: 'absolute',
                width: size,
                height: size,
                top: 0,
                left: 0,
                borderRadius: '50%',
                border: border,
            }}/>
        </div>
    )
}

export default Gravatar
