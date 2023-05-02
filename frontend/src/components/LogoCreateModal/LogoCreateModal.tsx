import React, {FC, useEffect, useState} from "react";
import {Button, Form, FormGroup, Modal} from "react-bootstrap";

import {LogoDraft} from "../../types/types";
import {default as LogoForm} from "../Form/Form";

import './style.css';


interface ModalProps {
    activeItem: LogoDraft;
    toggle: () => void;
    onSave: (logo: LogoDraft, nLogosToCreate: number) => void;
}


const steps = ['1', '2', '3', '4', '5'];
const stepTitles = [
    'Название и публичность',
    'Что у вас за бизнес?',
    'Цвета',
    'Выберите стиль будущего логотипа',
    'Объекты',
]


const LogoCreateModal: FC<ModalProps> = ({activeItem, toggle, onSave}) => {
    const [show, setShow] = useState<boolean>(true);
    const [item, setItem] = useState<LogoDraft>(Object.assign({}, activeItem));
    const [nLogosToCreate, setNLogosToCreate] = useState<number>(2);
    const [step, setStep] = useState<number>(0);

    const canGoToNextStep = () => {
        // Validates current step

        let errorMsg = null;

        if (step === 1 && activeItem.specialization.length < 1) {
            errorMsg = 'Нужно выбрать хотя бы одну специализацию';
        }

        if (step === 2 && item.palette === '') {
            errorMsg = 'Нужно выбрать палитру';
        }

        return errorMsg;
    }

    const nextStep = () => {
        // Calls step validation, shows validation error message or switches to the next step

        setStep((currentStep) => {
            let errMsg = canGoToNextStep();
            if (errMsg !== null) {
                alert(errMsg);
                return currentStep;
            }
            return currentStep + 1;
        })
    }

    const prevStep = () => setStep((currentStep) => currentStep - 1);

    const handleUpdate = (logo: LogoDraft) => setItem(logo);

    const handleNLogosChange = (newNLogos: number) => {
        setNLogosToCreate(newNLogos);
    }

    const handleHide = () => {
        setShow(false);
        toggle();
    }

    useEffect(() => {
        // Sets `Enter` as the key that switches to the next step for all steps except the last one

        const keyDownHandler = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (step < steps.length - 1) {
                    nextStep();
                }
            }
        };

        document.addEventListener('keydown', keyDownHandler);

        return () => {
            document.removeEventListener('keydown', keyDownHandler);
        };
    }, [item, onSave, step]);


    return (
        <Modal className={'logo-create-modal'} centered size={'lg'} show={show} backdrop={true} onHide={handleHide}>
            <Modal.Header closeButton> Создание логотипа </Modal.Header>
            <Modal.Body className={'logo-modal-body'}>
                <Form onSubmit={(e: React.FormEvent) => e.preventDefault()}>
                    <FormGroup>
                        <div className="SliderForm">
                            <LogoForm
                                activeItem={item}
                                currentIndex={step}
                                onUpdate={handleUpdate}
                                onNLogosChange={handleNLogosChange}
                                stepTitles={stepTitles}
                            />
                        </div>
                    </FormGroup>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <div style={{display: 'flex', flexDirection: 'row', alignContent: 'space-between'}}>
                    {step > 0 ? (
                        <>
                            <div>
                                <Button color="success" onClick={prevStep}>
                                    Назад
                                </Button>
                            </div>
                            <div style={{width: 5}}></div>
                        </>
                    ) : null}
                    {step !== steps.length - 1 ? (
                        <div>
                            <Button color="success" onClick={nextStep} disabled={canGoToNextStep() !== null}>
                                Далее
                            </Button>
                        </div>
                    ) : (
                        <Button color="success" onClick={() => onSave(item, nLogosToCreate)}>
                            Создать
                        </Button>
                    )}
                </div>
            </Modal.Footer>
        </Modal>
    );
}


export default LogoCreateModal;
