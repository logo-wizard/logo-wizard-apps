import React, {ChangeEvent, FC} from "react";
import {FormGroup} from "react-bootstrap";

import CheckPushButton from "../../PushButtons/CheckPushButton";

import '../style.css';


interface StepProps {
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    current: string[],
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
                    <CheckPushButton
                        key={index}
                        currentValues={current}
                        text={option.text}
                        value={option.value}
                        onChange={onChange}
                        limit={3}
                    />
                ))}
            </div>
        </FormGroup>
    )
}

export default SpecializationStep;
