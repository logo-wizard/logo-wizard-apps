import React, {ChangeEvent, FC} from "react";

import './style.css';


interface CheckPushButtonProps {
    currentValues: string[]
    text: string
    value: string
    onChange: (e: ChangeEvent<HTMLInputElement>) => void
    limit: number
}


const CheckPushButton: FC<CheckPushButtonProps> = ({currentValues, text, value, onChange, limit}) => {
    const limitReached = () => currentValues.length >= limit;
    const isChecked = () => currentValues.includes(value);
    const canBeClicked = () => isChecked() || !limitReached();

    return (
        <label
            className={`check-push-button ${!canBeClicked() ? ' disabled' : ''} ${isChecked() ? ' is-checked' : ''}`}
        >
            <input
                className={'hidden'}
                name={value}
                checked={isChecked()}
                type={'checkbox'}
                onChange={onChange}
                disabled={!canBeClicked()}
            />
            {text}
        </label>
    )
}


export default CheckPushButton;
