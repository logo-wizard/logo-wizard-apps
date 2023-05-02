import React, {ChangeEvent, FC} from "react";
import {FormGroup} from "react-bootstrap";

import '../style.css';


interface StepProps {
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    current: string[],
}


interface SpecializationOptionProps {
    currentSpecializations: string[]
    text: string
    value: string
    onChange: (e: ChangeEvent<HTMLInputElement>) => void
}


const SpecializationOption: FC<SpecializationOptionProps> = ({currentSpecializations, text, value, onChange}) => {
    const limitReached = () => currentSpecializations.length >= 3;
    const isChecked = () => currentSpecializations.includes(value);
    const canBeClicked = () => isChecked() || !limitReached();

    return (
        <label className={`label-as-button ${!canBeClicked() ? ' disabled' : ''}`}>
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


const specializationOptions: { text: string, value: string }[] = [
    {text: 'Медицина', value: 'medicine, pharmacy'},
    {text: 'Финансы', value: 'financial company'},
    {text: 'IT-компания', value: 'IT company, electronics'},
    {text: 'Строительство и ремонт', value: 'construction and repair company'},
    {text: 'Недвижимость', value: 'real estate company'},
    {text: 'Спорт', value: 'sports club'},
    {text: 'Кафе/ресторан', value: 'cafe, restaurant, bar'},
    {text: 'Кофейня', value: 'coffee shop'},
    {text: 'Салон красоты', value: 'beauty salon'},
    {text: 'Доставка', value: 'delivery service'},
    {text: 'Путешествия', value: 'travel company'},
    {text: 'Развлечения', value: 'entertainment, resort'},
    {text: 'Продукты', value: 'grocery store'},
    {text: 'Книжный магазин', value: 'book shop'},
    {text: 'Цветы', value: 'flower shop'},
]


const SpecializationStep: FC<StepProps> = ({onChange, current}) => {
    return (
        <FormGroup className={'form-container'}>
            <h4 style={{textAlign: 'center', color: '#999'}}>Выберите до трех специализаций</h4>
            <div className={'options-container'}>
                {specializationOptions.map((option, index) => (
                    <SpecializationOption
                        key={index}
                        currentSpecializations={current}
                        text={option.text}
                        value={option.value}
                        onChange={onChange}
                    />
                ))}
            </div>
        </FormGroup>
    )
}

export default SpecializationStep;
