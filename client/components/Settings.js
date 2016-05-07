'use strict';

const React = require('react');

class Settings extends React.Component {
    constructor (props) {
        super(props);

        this.state = Object.assign({}, props.defaultSettings);
    }

    handleValueChange (event) {
        this.setState({
            [event.target.name]: event.target.value
        });
    }

    handleCheckboxChange (event) {
        this.setState({
            [event.target.name]: event.target.checked
        });
    }

    shouldComponentUpdate (nextProps, nextState) {
        const shouldUpdate = Object.keys(this.state).some((stateProp) => {
            return this.state[stateProp] !== nextState[stateProp];
        });

        if (shouldUpdate) {
            this.props.settingsChangeHandler(Object.assign({}, nextState));

            return true;
        }

        return false;
    }

    render () {
        return (
            <form>
                <h4>Settings</h4>
                <ul className="horizontal-list square-font">
                    <li>
                        <label>
                            <input
                                type="checkbox"
                                name="naiveApproach"
                                checked={ this.state.naiveApproach }
                                onChange={ this.handleCheckboxChange.bind(this) }
                            />
                            Naive approach
                        </label>
                    </li>

                    <li>
                        <label>
                            <input
                                type="checkbox"
                                name="clientSmoothing"
                                checked={ this.state.clientSmoothing }
                                onChange={ this.handleCheckboxChange.bind(this) }
                            />
                            Client smoothing
                        </label>
                    </li>

                    <li>
                        <label>
                            <input
                                type="checkbox"
                                name="showServerPosition"
                                checked={ this.state.showServerPosition }
                                onChange={ this.handleCheckboxChange.bind(this) }
                            />
                            Show server position
                        </label>
                    </li>

                    <li>
                        <label>
                            <input
                                type="checkbox"
                                name="showDestinationPosition"
                                checked={ this.state.showDestinationPosition }
                                onChange={ this.handleCheckboxChange.bind(this) }
                            />
                            Show destination position
                        </label>
                    </li>

                    <li>
                        <label>
                            <input
                                type="checkbox"
                                name="clientPrediction"
                                checked={ this.state.clientPrediction }
                                onChange={ this.handleCheckboxChange.bind(this) }
                            />
                            Client prediction
                        </label>
                    </li>

                    <li>
                        <label>
                            Network offset
                            <input
                                type="input"
                                name="networkOffset"
                                size={ 4 }
                                maxlength={ 4 }
                                value={ this.state.networkOffset }
                                onChange={ this.handleValueChange.bind(this) }
                            />
                        </label>
                    </li>

                    <li>
                        <label>
                            Network buffer size
                            <input
                                type="input"
                                name="networkBufferSize"
                                size={ 4 }
                                maxlength={ 4 }
                                value={ this.state.networkBufferSize }
                                onChange={ this.handleValueChange.bind(this) }
                            />
                        </label>
                    </li>
                </ul>
            </form>
        );
    }
}

Settings.propTypes = {
    settingsChangeHandler: React.PropTypes.func.isRequired,
    defaultSettings: React.PropTypes.object
};

module.exports = Settings;
