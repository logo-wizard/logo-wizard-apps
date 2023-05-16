import React, {ChangeEvent, FC} from "react";
import {FormGroup} from "react-bootstrap";

import RadioPushButton from "../../PushButtons/RadioPushButton";

import '../style.css';


interface StepProps {
    onChange: (newPalette: string) => void;
    current: string,
}


const paletteOptions: { text: string, value: string }[] = [
    {text: 'Теплые тона', value: 'warm colors'},
    {text: 'Холодные тона', value: 'cold colors'},
    {text: 'Пастельные тона', value: 'pastel colors'},
    {text: 'Яркие цвета', value: 'bright colors'},
    {text: 'Черно-белое', value: 'grayscale'},
    {text: 'Градиент', value: 'gradient'},
    {text: 'Оттенки красного', value: 'red color'},
    {text: 'Оттенки оранжевого', value: 'orange color'},
    {text: 'Оттенки желтого', value: 'yellow color'},
    {text: 'Оттенки зеленого', value: 'green color'},
    {text: 'Оттенки синего', value: 'blue color'},
    {text: 'Оттенки фиолетового', value: 'purple color'},
]


const PaletteStep: FC<StepProps> = ({onChange, current}) => {
    return (
        <FormGroup className={'form-container'}>
            <div className={'options-container'}>
                {paletteOptions.map((option, index) => (
                    <React.Fragment key={index}>
                        <RadioPushButton
                            currentValue={current}
                            text={option.text}
                            value={option.value}
                            onChange={onChange}
                            name={'palette'}
                            disabled={false}
                        />
                    </React.Fragment>
                ))}
            </div>
        </FormGroup>
    )
}

export default PaletteStep;
