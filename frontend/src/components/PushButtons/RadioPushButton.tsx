import React, {ChangeEvent, FC} from "react";

import './style.css';


interface CheckPushButtonProps {
    currentValue: string
    text: string
    value: string
    onChange: (newStyle: string) => void
    disabled: boolean
    name: string
}


const RadioPushButton: FC<CheckPushButtonProps> = ({currentValue, text, value, onChange, disabled, name}) => {
    const isChecked = () => currentValue === value;

    const handleChange = (_: React.MouseEvent<HTMLInputElement>) => {
        onChange(isChecked() ? '' : value);
    }

    return (
        <label
            className={`check-push-button ${isChecked() ? ' is-checked' : ''}`}
        >
            <input
                className={'hidden'}
                name={name}
                value={value}
                checked={isChecked()}
                type={'radio'}
                onClick={handleChange}
                onChange={(_: ChangeEvent<HTMLInputElement>) => {}}
                disabled={disabled}
            />
            {text}
        </label>
    )
}


export default RadioPushButton;
