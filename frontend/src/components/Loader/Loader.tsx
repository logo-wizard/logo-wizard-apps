import React, {FC} from "react";

import {Triangle} from "react-loader-spinner";


interface LoaderProps {
    width: number
    height: number
}


const TriangleLoader: FC<LoaderProps> = ({width, height}) => {
    return (
        <Triangle
            height={width}
            width={height}
            color="var(--bs-primary)"
            ariaLabel="triangle-loading"
            wrapperStyle={{}}
            visible={true}
        />
    )
}

export default TriangleLoader;
