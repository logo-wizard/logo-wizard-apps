import React, {ChangeEvent, FC, useState} from "react";

import {LogoDraft} from "../../types/types";
import SpecializationStep from "./FormSteps/SpecializationStep";
import PaletteStep from "./FormSteps/PaletteStep";
import StyleStep from "./FormSteps/StyleStep";
import ObjectsStep from "./FormSteps/ObjectsStep";
import TitleStep from "./FormSteps/TitleStep";
import UserService from "../../services/UserService";

import "./style.css";


interface FormProps {
    activeItem: LogoDraft,
    currentIndex: number,
    onUpdate: (logo: LogoDraft) => void,
    onNLogosChange: (newNLogos: number) => void,
    stepTitles: string[],
}


const Form: FC<FormProps> = ({activeItem, currentIndex, onUpdate, onNLogosChange, stepTitles}) => {
    // A container of form steps

    const [item, setItem] = useState<LogoDraft>(Object.assign({}, activeItem));

    const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const curLogo = {...item};
        curLogo.title = e.target.value;
        setItem(curLogo);
        onUpdate(curLogo);
    }

    const handlePublicityChange = (e: ChangeEvent<HTMLInputElement>) => {
        const curLogo = {...item};
        curLogo.is_public = e.target.checked;
        setItem(curLogo);
        onUpdate(curLogo);
    }

    const handleNLogosToCreateChange = (e: ChangeEvent<HTMLInputElement>) => {
        onNLogosChange(parseInt(e.target.value));
    }

    const handleSpecChange = (e: ChangeEvent<HTMLInputElement>) => {
        const curLogo = {...item};
        if (e.target.checked) {
            curLogo.specialization.push(e.target.name)
        } else {
            let idx = item.specialization.indexOf(e.target.name);
            curLogo.specialization.splice(idx, 1);
        }
        setItem(curLogo);
        onUpdate(curLogo);
    }

    const handlePaletteChange = (newPalette: string) => {
        const curLogo = {...item};
        curLogo.palette = newPalette;
        setItem(curLogo);
        onUpdate(curLogo);
    }

    const handleStyleChange = (newStyle: string) => {
        const curLogo = {...item};
        curLogo.style = newStyle;
        setItem(curLogo);
        onUpdate(curLogo);
    }

    const handleObjectsChange = (newObj: string) => {
        const curLogo = {...item};
        curLogo.objects.push(newObj);
        setItem(curLogo);
    }

    const handleObjectRemoved = (index: number) => {
        const curLogo = {...item};
        curLogo.objects.splice(index, 1);
        setItem(curLogo);
    }

    const renderStep = () => {
        switch (currentIndex) {
            case 0 :
                return (
                    <TitleStep
                        currentTitle={item.title}
                        onTitleChange={handleTitleChange}
                        currentPublicity={item.is_public}
                        onPublicityChange={handlePublicityChange}
                        canChangePublicity={UserService.isLoggedIn()}
                        onNLogosToCreateChange={handleNLogosToCreateChange}
                    />
                );
            case 1:
                return (
                    <SpecializationStep onChange={handleSpecChange} current={item.specialization}/>
                );
            case 2:
                return (
                    <PaletteStep onChange={handlePaletteChange} current={item.palette}/>
                )
            case 3:
                return (
                    <StyleStep onStyleChanged={handleStyleChange} current={item.style}/>
                )
            case 4:
                return (
                    <ObjectsStep onObjectAdded={handleObjectsChange} onObjectRemoved={handleObjectRemoved}
                                 current={item.objects}/>
                )
            default:
                return (
                    <>Something went wrong</>
                )
        }
    }

    return (
        <div className="form-container">
            <h2 style={{textAlign: 'center'}}>{stepTitles[currentIndex]}</h2>
            {renderStep()}
        </div>
    );
};

export default Form;
