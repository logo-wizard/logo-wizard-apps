import React, {ChangeEvent, FC} from "react";
import {FormGroup} from "react-bootstrap";

import '../style.css';


interface StepProps {
    onChange: (newPalette: string) => void;
    current: string,
}


interface PaletteOptionProps {
    currentPalette: string
    text: string
    value: string
    onChange: (newPalette: string) => void
}


const PaletteOption: FC<PaletteOptionProps> = ({currentPalette, text, value, onChange}) => {
    const isChecked = () => currentPalette === value;

    const handleChange = (e: React.MouseEvent<HTMLInputElement>) => {
        onChange(isChecked() ? '' : value);
    }

    return (
        <label
            className={`label-as-button ${isChecked() ? ' is-checked' : ''}`}
        >
            <input
                className={'hidden'}
                name={'palette'}
                value={value}
                checked={isChecked()}
                type={'radio'}
                onClick={handleChange}
                onChange={(_: ChangeEvent<HTMLInputElement>) => {}}
            />
            {text}
        </label>
    )
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
                        <PaletteOption
                            currentPalette={current}
                            text={option.text}
                            value={option.value}
                            onChange={onChange}
                        />
                    </React.Fragment>
                ))}
            </div>
        </FormGroup>
    )
}

export default PaletteStep;
