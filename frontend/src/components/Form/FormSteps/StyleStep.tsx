import React, {FC} from "react";
import {FormGroup} from "react-bootstrap";

import RadioPushButton from "../../PushButtons/RadioPushButton";

import '../style.css';


interface StepProps {
    onStyleChanged: (newStyle: string) => void;
    current: string,
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
                        <RadioPushButton
                            currentValue={current}
                            text={option.text}
                            value={option.value}
                            onChange={onStyleChanged}
                            disabled={false}
                            name={'style'}
                        />
                    </React.Fragment>
                ))}
            </div>
        </FormGroup>
    )
}

export default StyleStep;
