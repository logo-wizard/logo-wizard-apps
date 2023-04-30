import React, {FC} from "react";


interface StepProps {
    currentIndex: number;
    steps: string[];
}


const Step: FC<StepProps> = ({currentIndex, steps}) => {
    return (
        <div className="steps-container">
            {steps.map((step, index) => {
                let color = currentIndex === index ? "#007bff" : "black";
                return (
                    <div key={index} className="steps-item">
                        <h5 style={{margin: 0, color: color}}>
                            {step}
                        </h5>
                    </div>
                );
            })}
        </div>
    );
};


export default Step;
