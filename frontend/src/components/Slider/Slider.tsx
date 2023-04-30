import React, {FC} from "react";
import ReactSlider from "react-slider";

import "../../index.css";
import "./style.css";


interface SliderProps {
    onStepChange: (newStep: number) => void,
    currentIndex: number,
    min?: number,
    max: number,
}


const Slider: FC<SliderProps> = ({onStepChange, currentIndex, min = 0, max}) => {
    return (
        <ReactSlider
            className="vertical-slider"
            markClassName="example-mark"
            onChange={onStepChange}
            trackClassName="example-track"
            defaultValue={0}
            value={currentIndex}
            min={min}
            max={max}
            marks
            renderMark={(props) => {
                if (props.key! < currentIndex) {
                    props.className = "example-mark example-mark-completed";
                } else if (props.key === currentIndex) {
                    props.className = "example-mark example-mark-active";
                }
                return <span {...props} />;
            }}
            orientation="vertical"
        />
    );
};

export default Slider;
