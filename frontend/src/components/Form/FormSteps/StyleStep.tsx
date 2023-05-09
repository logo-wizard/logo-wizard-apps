import React, {ChangeEvent, FC} from "react";
import {FormGroup} from "react-bootstrap";

import '../style.css';


interface StepProps {
    onStyleChanged: (newStyle: string) => void;
    current: string,
}


interface StyleOptionProps {
    currentStyle: string
    text: string
    value: string
    onChange: (newStyle: string) => void
    disabled: boolean
}


const StyleOption: FC<StyleOptionProps> = ({currentStyle, text, value, onChange, disabled}) => {
    const isChecked = () => currentStyle === value;

    const handleChange = (_: React.MouseEvent<HTMLInputElement>) => {
        onChange(isChecked() ? '' : value);
    }

    return (
        <label className={'label-as-button'}>
            <input
                className={'hidden'}
                name={'style'}
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


const styleOptions: { text: string, value: string }[] = [
    {text: 'Минималистичный дизайн', value: 'minimalistic style'},
    {text: 'Скетч', value: 'contour, hand drawn, sketch style'},
    {text: 'Неон', value: 'neon style'},
    {text: 'Pixel art', value: 'pixel art'},
    {text: 'Абстракция', value: 'abstract'},
    {text: 'Эмблема', value: 'emblem'},
    {text: 'Винтажный', value: 'vintage style'},
    {text: 'Элегантный', value: 'elegant style'},
]


const StyleStep: FC<StepProps> = ({onStyleChanged, current}) => {
    return (
        <FormGroup className={'form-container'}>
            <h4 style={{textAlign: 'center', color: '#999'}}>Или пропустите шаг, если не уверены или ничего не подошло</h4>
            <div className={'options-container'}>
                {styleOptions.map((option, index) => (
                    <React.Fragment key={index}>
                        <StyleOption
                            currentStyle={current}
                            text={option.text}
                            value={option.value}
                            onChange={onStyleChanged}
                            disabled={false}
                        />
                    </React.Fragment>
                ))}
            </div>
        </FormGroup>
    )
}

export default StyleStep;
export {StyleOption};
