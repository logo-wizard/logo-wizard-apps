import React, {ChangeEvent, FC, useState} from "react";
import {FormGroup, Form} from "react-bootstrap";
import RangeSlider from 'react-bootstrap-range-slider';


interface StepProps {
    currentTitle: string,
    onTitleChange: (e: ChangeEvent<HTMLInputElement>) => void;
    currentPublicity: boolean,
    onPublicityChange: (e: ChangeEvent<HTMLInputElement>) => void;
    canChangePublicity: boolean;
    onNLogosToCreateChange: (e: ChangeEvent<HTMLInputElement>) => void;
}


const TitleStep: FC<StepProps> = (
    {
        currentTitle,
        onTitleChange,
        currentPublicity,
        onPublicityChange,
        canChangePublicity,
        onNLogosToCreateChange,
    }
) => {
    const [nLogos, setNLogos] = useState<number>(2);

    const _changeNLogos = (e: ChangeEvent<HTMLInputElement>) => {
        const newNLogos = parseInt(e.target.value);
        setNLogos(newNLogos);
        onNLogosToCreateChange(e);
    }

    return (
        <FormGroup>
            <div className={'title-form-body'}>
                <Form.Control
                    maxLength={20}
                    name={'title'}
                    type={'text'}
                    value={currentTitle}
                    placeholder={'Название для логотипа'}
                    onChange={onTitleChange}
                />
                <Form.Group controlId={'is_public'}>
                    <Form.Check
                        name={'is_public'}
                        type={'checkbox'}
                        checked={currentPublicity}
                        onChange={onPublicityChange}
                        label={'Публичный логотип'}
                        disabled={!canChangePublicity}
                    />
                </Form.Group>
                <p className={'line-height-1_5'}>
                    Публичный логотип может просматривать кто угодно в интернете, а также такой логотип отображается в профиле.
                </p>
                <p className={'line-height-1_5'}>
                    Скрытые логотипы могут создавать только авторизованные пользователи.
                </p>
                <Form.Label>Количество вариантов: {nLogos}</Form.Label>
                <RangeSlider
                    value={nLogos}
                    onChange={_changeNLogos}
                    min={1}
                    max={5}
                    size={'sm'}
                    tooltip={'off'}
                    style={{position: 'relative'}}
                />
            </div>
        </FormGroup>
    )
}

export default TitleStep;
