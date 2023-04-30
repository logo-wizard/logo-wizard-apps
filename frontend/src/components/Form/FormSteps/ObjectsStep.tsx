import React, {ChangeEvent, FC, useEffect, useState} from "react";
import {Button, FormGroup, Form, Badge} from "react-bootstrap";


interface StepProps {
    onObjectAdded: (newObj: string) => void;
    onObjectRemoved: (index: number) => void;
    current: string[],
}


const ObjectsStep: FC<StepProps> = ({onObjectAdded, onObjectRemoved, current}) => {
    const [newObject, setNewObject] = useState<string>('');

    const canAddObject = () => current.length < 3;

    const _handleAddObject = (e: React.MouseEvent<HTMLElement>) => {
        if (newObject.trim() === '') {
            return;
        }
        onObjectAdded(newObject.trim());
        setNewObject('')
    }

    const _handleDeleteObject = (index: number) => onObjectRemoved(index);

    const _handleChange = (e: ChangeEvent<HTMLInputElement>) => setNewObject(e.target.value);

    useEffect(() => {
        const keyDownHandler = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && canAddObject()) {
                e.preventDefault();
                // @ts-ignore
                _handleAddObject();
            }
        };

        document.addEventListener('keydown', keyDownHandler);

        return () => {
            document.removeEventListener('keydown', keyDownHandler);
        };
    });

    return (
        <FormGroup className={'form-container'}>
            <h4 style={{textAlign: 'center', color: '#999'}}>Добавьте до трех объектов и мы постараемся добавить их на логотип</h4>
            <div className={'input-group mb-3'}>
                <Form.Control
                    name={'new_object'}
                    type={'text'}
                    value={newObject}
                    placeholder={'...'}
                    onChange={_handleChange}
                    disabled={!canAddObject()}
                />
                <Button
                    color="success"
                    className={'btn btn-outline-secondary'}
                    onClick={_handleAddObject}
                    style={{color: 'white'}}
                    disabled={!canAddObject()}
                >
                    Добавить
                </Button>
            </div>

            <div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 10, minHeight: 82}}>
                    {current.map((obj, index) => (
                        <div key={index}>
                            <span onClick={() => _handleDeleteObject(index)} style={{cursor: 'pointer'}}>
                                <Badge pill bg="primary">{obj}</Badge>
                                <Badge pill bg="primary">X</Badge>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </FormGroup>
    )
}

export default ObjectsStep;
